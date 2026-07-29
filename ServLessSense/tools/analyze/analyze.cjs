const { spawnSync } = require('child_process');
const path = require('path');

const projectPath = process.argv[2] || process.cwd();
const toolsDir = __dirname;

function runScript(scriptName, args = []) {
  const scriptPath = path.join(toolsDir, scriptName);
  console.log(`\n--- Running ${scriptName} ---`);
  const result = spawnSync('node', [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: toolsDir,
  });

  if (result.status !== 0) {
    console.warn(`${scriptName} exited with code ${result.status}`);
  }
}

console.log(`Analyzing project: ${projectPath}`);

runScript('run-eslint.cjs', [projectPath]);
runScript('asyncCalls.cjs', [projectPath]);

console.log('\nAnalysis complete. Results written to public/data/');
