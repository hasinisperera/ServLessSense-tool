const { ESLint } = require('eslint');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../public/data');
const SMELLS_DIR = path.join(DATA_DIR, 'smells');

/**
 * Get the project path from command-line arguments
 */
function getProjectPath() {
  const args = process.argv.slice(2);
  const projectPath = args[0] || process.cwd();
  const projectName = path.basename(projectPath);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(DATA_DIR, 'project-name.json'),
    JSON.stringify({ projectName })
  );

  return path.resolve(projectPath);
}

function collectFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      collectFiles(fullPath, fileList);
    } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function runEslint() {
  const projectRoot = getProjectPath();
  console.log(`Linting project located at: ${projectRoot}`);

  const filesToLint = collectFiles(projectRoot);
  console.log(`Found ${filesToLint.length} files to lint.`);

  const eslint = new ESLint({
    baseConfig: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['serverless-smells'],
      rules: {
        'serverless-smells/too-many-functions': 'warn',
        'serverless-smells/too-many-technologies': 'error',
        'serverless-smells/shared-code-blocks': 'warn',
        'serverless-smells/too-many-libraries': 'error',
      },
    },
    useEslintrc: false,
  });

  const results = await eslint.lintFiles(filesToLint);

  const groupedResults = {};
  results.forEach((result) => {
    result.messages.forEach((message) => {
      const ruleId = message.ruleId;
      if (!ruleId) return;
      if (!groupedResults[ruleId]) {
        groupedResults[ruleId] = [];
      }
      groupedResults[ruleId].push({
        filePath: result.filePath,
        line: message.line,
        column: message.column,
        message: message.message,
        severity: message.severity,
      });
    });
  });

  if (!fs.existsSync(SMELLS_DIR)) {
    fs.mkdirSync(SMELLS_DIR, { recursive: true });
  }

  for (const [ruleId, messages] of Object.entries(groupedResults)) {
    const ruleName = ruleId.replace('serverless-smells/', '');
    const outputPath = path.join(SMELLS_DIR, `${ruleName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(messages, null, 2));
    console.log(`Results for rule '${ruleId}' saved to ${outputPath}`);
  }

  const hasErrors = results.some((result) => result.errorCount > 0);
  if (hasErrors) {
    console.error('Linting completed with errors. Check the results directory.');
    process.exit(1);
  } else {
    console.log('Linting completed successfully with no errors.');
  }
}

runEslint().catch((error) => {
  console.error(error);
  process.exit(1);
});
