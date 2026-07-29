const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const DEFAULT_OUTPUT = path.resolve(__dirname, '../../public/data/smells/async-calls.json');

function getProjectPath() {
  const args = process.argv.slice(2);
  const projectPath = args[0] || process.cwd();
  return path.resolve(projectPath);
}

function getOutputPath() {
  const args = process.argv.slice(2);
  return args[1] ? path.resolve(args[1]) : DEFAULT_OUTPUT;
}

function checkForImplicitPromiseReturn(functionBody) {
  const returnPromiseRegex = /return\s+.*Promise\.|return\s+.*\.then\(|return\s+.*\.catch\(/;
  if (returnPromiseRegex.test(functionBody)) {
    return true;
  }

  const asyncOperationsRegex =
    /await\s+|fetch\(|axios\.|request\(|readFile|writeFile|\.post\(|\.get\(|\.put\(|\.delete\(/;
  return asyncOperationsRegex.test(functionBody);
}

function analyzeFiles(dirPath, outputFile) {
  const results = [];
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
          } else if (
            entry.endsWith('.js') ||
            entry.endsWith('.jsx') ||
            entry.endsWith('.ts') ||
            entry.endsWith('.tsx')
          ) {
            console.log(`Processing: ${fullPath}`);
            try {
              const fileContent = fs.readFileSync(fullPath, 'utf-8');
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

      traverse(ast, {
        ArrowFunctionExpression(nodePath) {
          analyzeFunction(nodePath.node, content, fileResults, filePath);
        },
        FunctionDeclaration(nodePath) {
          analyzeFunction(nodePath.node, content, fileResults, filePath);
        },
        FunctionExpression(nodePath) {
          analyzeFunction(nodePath.node, content, fileResults, filePath);
        },
        ClassMethod(nodePath) {
          analyzeFunction(nodePath.node, content, fileResults, filePath);
        },
        ObjectMethod(nodePath) {
          analyzeFunction(nodePath.node, content, fileResults, filePath);
        },
        NewExpression(nodePath) {
          if (nodePath.node.callee.name === 'Promise') {
            const loc = nodePath.node.loc;
            fileResults.push({
              type: 'promise-constructor',
              filePath,
              line: loc.start.line,
              code: content
                .substring(
                  content.lastIndexOf('\n', nodePath.node.start) + 1,
                  content.indexOf('\n', nodePath.node.start)
                )
                .trim(),
            });
          }
        },
        CallExpression(nodePath) {
          if (nodePath.node.callee.type === 'MemberExpression') {
            const property = nodePath.node.callee.property;
            if (property && (property.name === 'then' || property.name === 'catch')) {
              const loc = nodePath.node.loc;
              fileResults.push({
                type: 'promise-chain',
                filePath,
                line: loc.start.line,
                code: content
                  .substring(
                    content.lastIndexOf('\n', nodePath.node.start) + 1,
                    content.indexOf('\n', nodePath.node.start)
                  )
                  .trim(),
              });
            }
          }
        },
      });
    } catch (parseError) {
      console.error(`Error parsing ${filePath}:`, parseError.message);
      fileResults.push({
        type: 'parse-error',
        filePath,
        line: parseError.loc ? parseError.loc.line : 1,
        code: parseError.message,
      });
    }

    return fileResults;
  }

  function analyzeFunction(node, content, resultList, filePath) {
    const line = node.loc.start.line;
    const startLinePos = content.lastIndexOf('\n', node.start) + 1;
    const endLinePos = content.indexOf('\n', node.start);
    const code = content.substring(startLinePos, endLinePos > -1 ? endLinePos : undefined).trim();

    let type = 'sync';

    if (node.async) {
      type = 'async';
    } else if (node.generator) {
      type = 'generator';
    } else {
      const functionBody = content.substring(node.start, node.end);
      if (checkForImplicitPromiseReturn(functionBody)) {
        type = 'implicit-promise';
      }
    }

    resultList.push({
      type,
      filePath,
      line,
      code,
      functionName: node.id ? node.id.name : 'anonymous',
    });
  }

  scanDirectory(dirPath);

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Analysis complete. Results saved to ${outputFile}`);
  console.log(`Found ${results.length} functions/promises:`);

  const counts = results.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  Object.entries(counts).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });
}

const projectDirectory = getProjectPath();
const outputFilePath = getOutputPath();

console.log(`Analyzing files in: ${projectDirectory}`);
console.log(`Results will be saved to: ${outputFilePath}`);

analyzeFiles(projectDirectory, outputFilePath);
