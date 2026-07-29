const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/**
 * Get the project path from command-line arguments
 * Default to current directory if not provided
 */
function getProjectPath() {
  const args = process.argv.slice(2);
  const projectPath = args[0] || process.cwd();
  return path.resolve(projectPath);
}

/**
 * Get the output file path from command-line arguments
 * Default to './lint-results/serverless-smells/async-calls.json' if not provided
 */
function getOutputPath() {
  const args = process.argv.slice(2);
  return args[1] || './lint-results/serverless-smells/async-calls.json';
}

/**
 * Determines if a function returns a Promise (explicitly or implicitly)
 * This is a simplified check and might need enhancement based on your specific needs
 */
function checkForImplicitPromiseReturn(functionBody) {
  // Check for return statements with Promise-like patterns
  const returnPromiseRegex = /return\s+.*Promise\.|return\s+.*\.then\(|return\s+.*\.catch\(/;
  if (returnPromiseRegex.test(functionBody)) {
    return true;
  }
  
  // Check for common async operations
  const asyncOperationsRegex = /await\s+|fetch\(|axios\.|request\(|readFile|writeFile|\.post\(|\.get\(|\.put\(|\.delete\(/;
  return asyncOperationsRegex.test(functionBody);
}

/**
 * Analyze JavaScript/TypeScript files for function types
 */
function analyzeFiles(dirPath, outputFile) {
  const results = [];

  // Skip node_modules and other common non-source directories
  const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];

  function scanDirectory(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath);
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        
        try {
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            if (!skipDirs.includes(entry)) {
              scanDirectory(fullPath);
            }
          } else if (entry.endsWith(".js") || entry.endsWith(".jsx") || 
                     entry.endsWith(".ts") || entry.endsWith(".tsx")) {
            console.log(`Processing: ${fullPath}`);
            try {
              const fileContent = fs.readFileSync(fullPath, "utf-8");
              results.push(...analyzeFile(fileContent, fullPath));
            } catch (fileReadError) {
              console.error(`Error reading file ${fullPath}:`, fileReadError.message);
            }
          }
        } catch (statError) {
          console.error(`Error accessing ${fullPath}:`, statError.message);
        }
      }
    } catch (dirError) {
      console.error(`Error reading directory ${currentPath}:`, dirError.message);
    }
  }

  function analyzeFile(content, filePath) {
    const fileResults = [];
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    
    try {
      // Parse the file into an AST
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          isTypeScript ? 'typescript' : null,
          'classProperties',
          'decorators-legacy',
          'objectRestSpread',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator',
        ].filter(Boolean),
        errorRecovery: true,
      });
      
      // Traverse the AST to find functions
      traverse(ast, {
        // Arrow functions
        ArrowFunctionExpression(path) {
          analyzeFunction(path.node, content, fileResults, filePath);
        },
        
        // Regular functions (declarations and expressions)
        FunctionDeclaration(path) {
          analyzeFunction(path.node, content, fileResults, filePath);
        },
        
        FunctionExpression(path) {
          analyzeFunction(path.node, content, fileResults, filePath);
        },
        
        // Class methods
        ClassMethod(path) {
          analyzeFunction(path.node, content, fileResults, filePath);
        },
        
        // Object methods
        ObjectMethod(path) {
          analyzeFunction(path.node, content, fileResults, filePath);
        },
        
        // New Promise creation
        NewExpression(path) {
          if (path.node.callee.name === 'Promise') {
            const loc = path.node.loc;
            fileResults.push({
              type: 'promise-constructor',
              filePath,
              line: loc.start.line,
              code: content.substring(
                content.lastIndexOf('\n', path.node.start) + 1,
                content.indexOf('\n', path.node.start)
              ).trim()
            });
          }
        },
        
        // Promise chaining (.then, .catch)
        CallExpression(path) {
          if (path.node.callee.type === 'MemberExpression') {
            const property = path.node.callee.property;
            if (property && (property.name === 'then' || property.name === 'catch')) {
              const loc = path.node.loc;
              fileResults.push({
                type: 'promise-chain',
                filePath,
                line: loc.start.line,
                code: content.substring(
                  content.lastIndexOf('\n', path.node.start) + 1,
                  content.indexOf('\n', path.node.start)
                ).trim()
              });
            }
          }
        }
      });
      
    } catch (parseError) {
      console.error(`Error parsing ${filePath}:`, parseError.message);
      fileResults.push({
        type: 'parse-error',
        filePath,
        line: parseError.loc ? parseError.loc.line : 1,
        code: parseError.message
      });
    }
    
    return fileResults;
  }

  function analyzeFunction(node, content, results, filePath) {
    // Get line number from AST
    const line = node.loc.start.line;
    
    // Get the function text
    const startLine = content.substring(0, node.start).split('\n').length;
    const startLinePos = content.lastIndexOf('\n', node.start) + 1;
    const endLinePos = content.indexOf('\n', node.start);
    const code = content.substring(startLinePos, endLinePos > -1 ? endLinePos : undefined).trim();
    
    // Determine function type
    let type = 'sync';
    
    if (node.async) {
      type = 'async';
    } else if (node.generator) {
      type = 'generator';
    } else {
      // Check for implicit Promise returns
      const functionBody = content.substring(node.start, node.end);
      if (checkForImplicitPromiseReturn(functionBody)) {
        type = 'implicit-promise';
      }
    }
    
    // Add to results
    results.push({
      type,
      filePath,
      line,
      code,
      functionName: node.id ? node.id.name : 'anonymous'
    });
  }

  scanDirectory(dirPath);

  // Make sure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Analysis complete. Results saved to ${outputFile}`);
  console.log(`Found ${results.length} functions/promises:`);
  
  // Print a summary
  const counts = results.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(counts).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });
}

// Get project path and output file from command line arguments
const projectDirectory = getProjectPath();
const outputFilePath = getOutputPath();

console.log(`Analyzing files in: ${projectDirectory}`);
console.log(`Results will be saved to: ${outputFilePath}`);

// Run the analysis
analyzeFiles(projectDirectory, outputFilePath);