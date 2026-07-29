const { ESLint } = require("eslint");
const fs = require("fs");
const path = require("path");

/**
 * Get the project path from command-line arguments
 * Default to current directory if not provided
 */
function getProjectPath() {
  // Check for command-line arguments (node run-eslint.cjs [projectPath])
  const args = process.argv.slice(2);
  const projectPath = args[0] || process.cwd();
  const projectName = projectPath.split('/').pop();
  console.log(projectName);
  const outputProjectName = './project-details';
  if (!fs.existsSync(outputProjectName)) {
    fs.mkdirSync(outputProjectName);
  }
  const filePath = path.join(outputProjectName, `project-name.json`);
  fs.writeFileSync(filePath, JSON.stringify({"projectName": projectName}));
  
  
  // Resolve to absolute path
  return path.resolve(projectPath);
}

/**
 * Recursively collect all JavaScript/TypeScript files in a directory,
 * excluding node_modules and hidden folders.
 */
function collectFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      collectFiles(fullPath, fileList);
    } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function runEslint() {
  // Get project path from command line arguments
  const projectRoot = getProjectPath();
  console.log(`Linting project located at: ${projectRoot}`);

  // Collect all relevant files in the project
  const filesToLint = collectFiles(projectRoot);
  console.log(`Found ${filesToLint.length} files to lint.`);

  const eslint = new ESLint({
    baseConfig: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      plugins: ["serverless-smells"],
      rules: {
        "serverless-smells/too-many-functions": "warn",
        "serverless-smells/too-many-technologies": "error",
        "serverless-smells/shared-code-blocks": "warn",
        "serverless-smells/too-many-libraries": "error",
      },
    },
    useEslintrc: false, // Ignore existing ESLint configs in the project
  });

  // Run ESLint on all collected files
  const results = await eslint.lintFiles(filesToLint);

  // Group results by rule ID
  const groupedResults = {};
  results.forEach((result) => {
    result.messages.forEach((message) => {
      const ruleId = message.ruleId;
      if (!groupedResults[ruleId]) {
        groupedResults[ruleId] = [];
      }
      groupedResults[ruleId].push({
        filePath: result.filePath,
        line: message.line,
        column: message.column,
        message: message.message,
        severity: message.severity, // 1 = warning, 2 = error
      });
    });
  });

  // Create an output directory for results
  const outputDir = './lint-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Write results for each rule to a separate JSON file
  for (const [ruleId, messages] of Object.entries(groupedResults)) {
    const filePath = path.join(outputDir, `${ruleId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
    console.log(`Results for rule '${ruleId}' saved to ${filePath}`);
  }

  // Exit with a non-zero code if there are errors
  const hasErrors = results.some((result) => result.errorCount > 0);
  if (hasErrors) {
    console.error("Linting completed with errors. Check the results directory.");
    process.exit(1);
  } else {
    console.log("Linting completed successfully with no errors.");
  }
}

runEslint().catch((error) => {
  console.error(error);
  process.exit(1);
});