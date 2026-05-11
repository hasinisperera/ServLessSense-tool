const fs = require("fs");
const path = require("path");
const glob = require("glob");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Detect dependencies listed in package.json but not used in the project.",
      category: "Best Practices",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          ignoreDependencies: {
            type: "array",
            items: { type: "string" },
            description: "List of dependencies to ignore"
          },
          ignoreDevDependencies: {
            type: "boolean",
            description: "Whether to ignore all devDependencies"
          },
          allowUnusedDevDependencies: {
            type: "boolean",
            description: "Whether to allow unused devDependencies"
          },
          customPackageJsonPath: {
            type: "string",
            description: "Custom path to package.json file"
          },
          checkPeerDependencies: {
            type: "boolean",
            description: "Whether to check peer dependencies"
          },
          monorepoWorkspaces: {
            type: "array",
            items: { type: "string" },
            description: "Workspace patterns for monorepo project"
          },
          fileExtensions: {
            type: "array",
            items: { type: "string" },
            description: "File extensions to scan for imports"
          },
          cacheResults: {
            type: "boolean", 
            description: "Whether to cache results for performance"
          },
          cacheFileName: {
            type: "string",
            description: "Cache file name"
          },
          checkContentPatterns: {
            type: "boolean",
            description: "Whether to check file content for string patterns"
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unusedDependency:
        "The dependency '{{ name }}' is listed in package.json but is not used in the project.",
      unusedDevDependency:
        "The devDependency '{{ name }}' is listed in package.json but is not used in the project.",
      unusedPeerDependency:
        "The peerDependency '{{ name }}' is listed in package.json but is not used in the project.",
    },
  },
  create(context) {
    // Get options with defaults
    const options = context.options[0] || {};
    const ignoreDependencies = options.ignoreDependencies || [];
    const ignoreDevDependencies = options.ignoreDevDependencies || false;
    const allowUnusedDevDependencies = options.allowUnusedDevDependencies || false;
    const customPackageJsonPath = options.customPackageJsonPath || null;
    const checkPeerDependencies = options.checkPeerDependencies || false;
    const monorepoWorkspaces = options.monorepoWorkspaces || [];
    const fileExtensions = options.fileExtensions || [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte"];
    const cacheResults = options.cacheResults || false;
    const cacheFileName = options.cacheFileName || ".eslint-no-unused-deps-cache.json";
    const checkContentPatterns = options.checkContentPatterns !== false;  // Default to true

    // Cache mechanism
    const cacheFilePath = path.resolve(context.getCwd(), cacheFileName);
    let cache = {};
    let cacheNeedsUpdate = false;

    if (cacheResults) {
      try {
        if (fs.existsSync(cacheFilePath)) {
          cache = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
        }
      } catch (error) {
        // If cache is corrupted, just start fresh
        cache = {};
      }
    }

    // Process package.json file
    let packageJsonPath = customPackageJsonPath 
      ? path.resolve(context.getCwd(), customPackageJsonPath)
      : path.resolve(context.getCwd(), "package.json");
    
    let productionDependencies = [];
    let devDependencies = [];
    let peerDependencies = [];
    let packageJson = null;
    let workspacePackages = [];

    try {
      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        productionDependencies = Object.keys(packageJson.dependencies || {});
        devDependencies = Object.keys(packageJson.devDependencies || {});
        peerDependencies = Object.keys(packageJson.peerDependencies || {});
        
        // Process workspaces for monorepo
        if (monorepoWorkspaces.length === 0 && packageJson.workspaces) {
          if (Array.isArray(packageJson.workspaces)) {
            monorepoWorkspaces = packageJson.workspaces;
          } else if (packageJson.workspaces.packages) {
            monorepoWorkspaces = packageJson.workspaces.packages;
          }
        }
      } else {
        // No need to proceed if package.json doesn't exist
        return {};
      }
    } catch (error) {
      // Handle errors gracefully
      context.report({
        loc: { line: 1, column: 0 },
        message: `Error reading package.json: ${error.message}`,
      });
      return {};
    }

    // Process workspace packages in monorepo if applicable
    if (monorepoWorkspaces.length > 0) {
      monorepoWorkspaces.forEach(pattern => {
        try {
          const matches = glob.sync(pattern, { cwd: context.getCwd() });
          matches.forEach(match => {
            const workspacePackageJsonPath = path.join(context.getCwd(), match, 'package.json');
            if (fs.existsSync(workspacePackageJsonPath)) {
              try {
                const workspacePackageJson = JSON.parse(fs.readFileSync(workspacePackageJsonPath, "utf8"));
                if (workspacePackageJson.name) {
                  workspacePackages.push(workspacePackageJson.name);
                }
              } catch (e) {
                // Skip invalid workspace package.json
              }
            }
          });
        } catch (e) {
          // Skip invalid workspace pattern
        }
      });
    }

    // Track all modules used in the codebase
    const usedDependencies = new Set();
    
    // Track dependencies with '@' namespace properly
    function normalizePackageName(name) {
      if (name.startsWith('@')) {
        // Handle scoped packages by taking the first two parts
        const parts = name.split('/');
        if (parts.length >= 2) {
          return `${parts[0]}/${parts[1]}`;
        }
      }
      return name;
    }

    // Check if the dependency might be a sub-dependency of the actual import
    function isSubDependency(importPath, dependency) {
      // Check for common patterns of sub-dependencies
      return importPath.startsWith(dependency + '/') || 
             importPath === dependency;
    }

    // Auto-detect build tools and frameworks that might be used implicitly
    function detectImplicitDependencies() {
      const implicit = new Set();
      
      // Check for common build tools in scripts
      if (packageJson && packageJson.scripts) {
        const scripts = Object.values(packageJson.scripts).join(' ');
        
        // Expanded list of common build tools
        const buildTools = [
          // Build systems and bundlers
          'webpack', 'rollup', 'parcel', 'browserify', 'esbuild', 'snowpack', 'vite',
          
          // Transpilers and compilers
          'babel', 'typescript', 'swc', 'tsc',
          
          // Testing
          'jest', 'mocha', 'ava', 'karma', 'cypress', 'playwright', 'puppeteer', 'vitest',
          
          // Linting and formatting
          'eslint', 'prettier', 'stylelint', 'standard',
          
          // Task runners
          'gulp', 'grunt', 'broccoli',
          
          // Package managers
          'npm', 'yarn', 'pnpm', 'lerna', 'nx',

          // Documentation
          'storybook', 'docusaurus', 'typedoc', 'jsdoc',

          // Frameworks
          'react', 'vue', 'angular', 'svelte', 'preact', 'solid', 'next', 'nuxt', 'gatsby'
        ];
        
        buildTools.forEach(tool => {
          if (scripts.includes(tool)) {
            implicit.add(tool);
            // Add common prefixes for these tools
            implicit.add(`${tool}-cli`);
            
            // Add framework specific prefixes
            if (['react', 'vue', 'angular', 'svelte'].includes(tool)) {
              implicit.add(`${tool}-dom`);
              implicit.add(`@${tool}/core`);
            }
            
            // Add specific package formats
            if (tool === 'babel') {
              implicit.add('@babel/core');
              implicit.add('@babel/preset-env');
            } else if (tool === 'eslint') {
              implicit.add('eslint-plugin-import');
              implicit.add('eslint-config-standard');
            } else if (tool === 'typescript' || tool === 'tsc') {
              implicit.add('typescript');
              implicit.add('@types/node');
            } else if (tool === 'webpack') {
              implicit.add('webpack-cli');
              implicit.add('webpack-dev-server');
            } else if (tool === 'jest') {
              implicit.add('@jest/core');
              implicit.add('ts-jest');
            }
          }
        });
      }
      
      // Check for more framework-specific configuration files
      const configFiles = [
        { file: 'webpack.config.js', deps: ['webpack', 'webpack-cli'] },
        { file: 'rollup.config.js', deps: ['rollup'] },
        { file: 'babel.config.js', deps: ['@babel/core', 'babel-core'] },
        { file: '.babelrc', deps: ['@babel/core', 'babel-core'] },
        { file: 'tsconfig.json', deps: ['typescript'] },
        { file: 'jest.config.js', deps: ['jest'] },
        { file: '.eslintrc', deps: ['eslint'] },
        { file: '.eslintrc.js', deps: ['eslint'] },
        { file: '.eslintrc.json', deps: ['eslint'] },
        { file: 'prettier.config.js', deps: ['prettier'] },
        { file: '.prettierrc', deps: ['prettier'] },
        { file: 'vite.config.js', deps: ['vite'] },
        { file: 'next.config.js', deps: ['next'] },
        { file: 'nuxt.config.js', deps: ['nuxt'] },
        { file: 'svelte.config.js', deps: ['svelte'] },
        { file: '.storybook/main.js', deps: ['@storybook/core'] },
        { file: 'tailwind.config.js', deps: ['tailwindcss'] },
        { file: 'playwright.config.js', deps: ['@playwright/test'] },
        { file: 'cypress.json', deps: ['cypress'] },
        { file: 'cypress.config.js', deps: ['cypress'] },
        { file: 'vitest.config.js', deps: ['vitest'] },
      ];
      
      configFiles.forEach(({ file, deps }) => {
        const configPath = path.resolve(context.getCwd(), file);
        if (fs.existsSync(configPath)) {
          deps.forEach(dep => implicit.add(dep));
        }
      });

      // Check for CSS preprocessors
      const cssFiles = glob.sync('**/*.{scss,less,styl}', { 
        cwd: context.getCwd(), 
        ignore: ['**/node_modules/**']
      });
      
      if (cssFiles.some(file => file.endsWith('.scss') || file.endsWith('.sass'))) {
        implicit.add('sass');
        implicit.add('node-sass');
        implicit.add('sass-loader');
      }
      
      if (cssFiles.some(file => file.endsWith('.less'))) {
        implicit.add('less');
        implicit.add('less-loader');
      }
      
      if (cssFiles.some(file => file.endsWith('.styl'))) {
        implicit.add('stylus');
        implicit.add('stylus-loader');
      }

      // Check for browser-specific dependencies by scanning HTML files
      const htmlFiles = glob.sync('**/*.html', { 
        cwd: context.getCwd(), 
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'] 
      });
      
      htmlFiles.forEach(htmlFile => {
        try {
          const content = fs.readFileSync(path.join(context.getCwd(), htmlFile), 'utf8');
          
          // Check for script tags with CDN links that might indicate browser dependencies
          const scriptTagRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/g;
          let match;
          
          while ((match = scriptTagRegex.exec(content)) !== null) {
            const src = match[1];
            
            // Check for common CDN patterns
            if (src.includes('jquery')) implicit.add('jquery');
            if (src.includes('bootstrap')) implicit.add('bootstrap');
            if (src.includes('react')) implicit.add('react');
            if (src.includes('vue')) implicit.add('vue');
            if (src.includes('angular')) implicit.add('angular');
            if (src.includes('lodash')) implicit.add('lodash');
            if (src.includes('moment')) implicit.add('moment');
            if (src.includes('axios')) implicit.add('axios');
          }
        } catch (e) {
          // Skip files with read errors
        }
      });
      
      return implicit;
    }

    // Enhanced pattern detection in file content
    function scanFileContentsForDependencyUsage() {
      if (!checkContentPatterns) return new Set();
      
      const detectedDeps = new Set();
      const filesToScan = [];

      // Get all relevant files to scan
      fileExtensions.forEach(ext => {
        const matches = glob.sync(`**/*${ext}`, {
          cwd: context.getCwd(),
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
        });
        filesToScan.push(...matches);
      });
      
      // Common patterns for dependency usage that might not be caught by import/require detection
      const patterns = [
        // Dynamic imports with string concatenation
        /import\s*\(\s*['"`][^'"`]*['"`]\s*\+/,
        // Webpack specific imports
        /require\.context\(/,
        // Config based imports (often used in Next.js, etc.)
        /config\.resolve\.alias/,
        // CSS/SCSS imports
        /@import\s+['"][^'"]+['"]/,
        // HTML script tags
        /<script[^>]*src=/,
        // Common CDN patterns 
        /cdn\.jsdelivr\.net\/npm\//,
        /unpkg\.com\//,
        // React specific
        /React\.lazy\s*\(\s*\(\s*\)\s*=>\s*import/,
        // Vue specific
        /Vue\.component\([^,]+,\s*\(\)\s*=>\s*import/,
        // Angular specific
        /loadChildren\s*:\s*['"](.*?)['"]/,
        // Native ESM browser imports
        /<script\s+type\s*=\s*['"]module['"]/
      ];

      // Additional patterns for specific dependencies
      const dependencySpecificPatterns = {};
      
      // Add all dependencies to be checked for specific string patterns
      [...productionDependencies, ...devDependencies, ...peerDependencies].forEach(dep => {
        const normalizedName = dep.replace(/[^a-zA-Z0-9]/g, '');
        dependencySpecificPatterns[dep] = new RegExp(`['"\`]${normalizedName}['"\`]|['"\`]${dep}['"\`]`, 'i');
      });

      // Scan files
      filesToScan.forEach(file => {
        try {
          const content = fs.readFileSync(path.join(context.getCwd(), file), 'utf8');
          
          // Check for general patterns
          patterns.forEach(pattern => {
            if (pattern.test(content)) {
              // If we find dynamic imports, we're more lenient with dependencies
              if (pattern.toString().includes('import') || 
                  pattern.toString().includes('require')) {
                productionDependencies.forEach(dep => {
                  // For dynamic imports, consider any dependency that's mentioned in the file
                  if (content.includes(dep)) {
                    detectedDeps.add(dep);
                  }
                });
              }
            }
          });

          // Check for specific dependency mentions
          Object.entries(dependencySpecificPatterns).forEach(([dep, pattern]) => {
            if (pattern.test(content)) {
              detectedDeps.add(dep);
            }
          });
        } catch (e) {
          // Skip files with read errors
        }
      });

      return detectedDeps;
    }

    // Detect potential implicitly used dependencies
    let implicitDependencies = new Set();
    
    // Scan for content-based dependency references
    let contentBasedDependencies = new Set();

    // Pre-populate some dependencies that are known to be used implicitly
    const browserAPIDependencies = new Set([
      'core-js', 
      'regenerator-runtime', 
      'whatwg-fetch',
      'promise-polyfill',
      'babel-polyfill',
      '@babel/polyfill'
    ]);

    // Add browser API dependencies to implicit dependencies
    browserAPIDependencies.forEach(dep => implicitDependencies.add(dep));

    // Only do intensive file scanning once per run
    let filesScanPerformed = false;

    return {
      ImportDeclaration(node) {
        // Track imported dependencies
        if (node.source && node.source.value) {
          const importPath = node.source.value;
          
          // Skip relative imports
          if (importPath.startsWith('.')) {
            return;
          }

          // Handle TypeScript path aliases that might be defined in tsconfig.json
          if (importPath.startsWith('@/') || importPath.startsWith('~/')) {
            return; // These are likely aliases, not packages
          }
          
          const importedModule = normalizePackageName(importPath.split('/')[0]);
          usedDependencies.add(importedModule);
          
          // For non-scoped packages, also track direct sub-dependencies
          if (!importedModule.startsWith('@')) {
            // Handle case like 'lodash/map'
            const parts = importPath.split('/');
            if (parts.length > 1) {
              usedDependencies.add(parts[0]);
            }
          }
        }
      },
      CallExpression(node) {
        // Track require() calls
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length > 0 &&
          node.arguments[0].type === "Literal"
        ) {
          const requirePath = node.arguments[0].value;
          
          // Skip relative imports
          if (typeof requirePath === 'string' && requirePath.startsWith('.')) {
            return;
          }

          // Handle TypeScript path aliases
          if (typeof requirePath === 'string' && 
             (requirePath.startsWith('@/') || requirePath.startsWith('~/'))) {
            return;
          }
          
          if (typeof requirePath === 'string') {
            const requiredModule = normalizePackageName(requirePath.split('/')[0]);
            usedDependencies.add(requiredModule);
            
            // For non-scoped packages, also track direct sub-dependencies
            if (!requiredModule.startsWith('@')) {
              // Handle case like require('lodash/map')
              const parts = requirePath.split('/');
              if (parts.length > 1) {
                usedDependencies.add(parts[0]);
              }
            }
          }
        }

        // Track CommonJS require with variable expressions
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length > 0 &&
          node.arguments[0].type === "TemplateLiteral"
        ) {
          // For template literals, check the quasis (static parts)
          if (node.arguments[0].quasis && node.arguments[0].quasis.length > 0) {
            node.arguments[0].quasis.forEach(quasi => {
              if (quasi.value && quasi.value.raw) {
                const staticPart = quasi.value.raw;
                if (!staticPart.startsWith('.') && staticPart !== '') {
                  const possibleModule = normalizePackageName(staticPart.split('/')[0]);
                  if (possibleModule) {
                    usedDependencies.add(possibleModule);
                  }
                }
              }
            });
          }
        }
      },
      // Handle dynamic imports
      ImportExpression(node) {
        if (node.source) {
          // Handle string literals
          if (node.source.type === "Literal" && typeof node.source.value === 'string') {
            const importPath = node.source.value;
            
            // Skip relative imports
            if (!importPath.startsWith('.')) {
              const importedModule = normalizePackageName(importPath.split('/')[0]);
              usedDependencies.add(importedModule);
            }
          }
          // Handle template literals (more dynamic imports)
          else if (node.source.type === "TemplateLiteral" && 
                  node.source.quasis && 
                  node.source.quasis.length > 0) {
            
            node.source.quasis.forEach(quasi => {
              if (quasi.value && quasi.value.raw) {
                const staticPart = quasi.value.raw;
                if (!staticPart.startsWith('.') && staticPart !== '') {
                  const possibleModule = normalizePackageName(staticPart.split('/')[0]);
                  if (possibleModule) {
                    usedDependencies.add(possibleModule);
                  }
                }
              }
            });
          }
        }
      },
      // JSX specific handling
      JSXOpeningElement(node) {
        // Handle potential React components from libraries
        if (node.name && node.name.name) {
          // Check for components that might be from external libraries
          // This is a heuristic - uppercase first letter indicates a component
          const componentName = node.name.name;
          if (componentName[0] === componentName[0].toUpperCase()) {
            // Check if any dependency name is a substring of the component
            [...productionDependencies, ...devDependencies].forEach(dep => {
              // Convert dependency name to PascalCase for comparison
              const depParts = dep.split(/[-/@]/).filter(Boolean);
              const pascalCaseDep = depParts.map(part => 
                part.charAt(0).toUpperCase() + part.slice(1)
              ).join('');
              
              // If component name contains the dependency name in PascalCase
              if (componentName === pascalCaseDep || 
                  componentName.startsWith(pascalCaseDep)) {
                usedDependencies.add(dep);
              }
            });
          }
        }
      },
      'Program:exit': function () {
        // On first pass, perform heavy operations
        if (!filesScanPerformed) {
          // Detect implicit dependencies
          implicitDependencies = detectImplicitDependencies();
          
          // Scan file contents for pattern-based dependency detection
          contentBasedDependencies = scanFileContentsForDependencyUsage();
          
          filesScanPerformed = true;
        }

        // Add workspace packages as used dependencies in monorepo
        workspacePackages.forEach(pkg => usedDependencies.add(pkg));
        
        // Add implicit dependencies to used dependencies
        implicitDependencies.forEach(dep => usedDependencies.add(dep));
        
        // Add content-based detected dependencies
        contentBasedDependencies.forEach(dep => usedDependencies.add(dep));
        
        // Add globally ignored dependencies
        ignoreDependencies.forEach(dep => usedDependencies.add(dep));
        
        // Process production dependencies
        productionDependencies.forEach((dependency) => {
          // Skip if in ignored list
          if (ignoreDependencies.includes(dependency)) {
            return;
          }
          
          // Check if dependency is used
          let isDependencyUsed = usedDependencies.has(dependency);
          
          // Check if it might be used as a sub-dependency
          if (!isDependencyUsed) {
            for (const used of usedDependencies) {
              if (isSubDependency(used, dependency)) {
                isDependencyUsed = true;
                break;
              }
            }
          }
          
          if (!isDependencyUsed) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: "unusedDependency",
              data: { name: dependency },
            });
          }
        });
        
        // Process dev dependencies if not ignored
        if (!ignoreDevDependencies && !allowUnusedDevDependencies) {
          devDependencies.forEach((dependency) => {
            // Skip if in ignored list
            if (ignoreDependencies.includes(dependency)) {
              return;
            }
            
            // Check if dependency is used
            let isDependencyUsed = usedDependencies.has(dependency);
            
            // Check if it might be used as a sub-dependency
            if (!isDependencyUsed) {
              for (const used of usedDependencies) {
                if (isSubDependency(used, dependency)) {
                  isDependencyUsed = true;
                  break;
                }
              }
            }
            
            if (!isDependencyUsed) {
              context.report({
                loc: { line: 1, column: 0 },
                messageId: "unusedDevDependency",
                data: { name: dependency },
              });
            }
          });
        }
        
        // Process peer dependencies if enabled
        if (checkPeerDependencies) {
          peerDependencies.forEach((dependency) => {
            // Skip if in ignored list
            if (ignoreDependencies.includes(dependency)) {
              return;
            }
            
            // Check if dependency is used
            let isDependencyUsed = usedDependencies.has(dependency);
            
            // Check if it might be used as a sub-dependency
            if (!isDependencyUsed) {
              for (const used of usedDependencies) {
                if (isSubDependency(used, dependency)) {
                  isDependencyUsed = true;
                  break;
                }
              }
            }
            
            if (!isDependencyUsed) {
              context.report({
                loc: { line: 1, column: 0 },
                messageId: "unusedPeerDependency",
                data: { name: dependency },
              });
            }
          });
        }
        
        // Update cache if needed
        if (cacheResults && cacheNeedsUpdate) {
          try {
            fs.writeFileSync(cacheFilePath, JSON.stringify(cache), 'utf8');
          } catch (error) {
            // Silently fail on cache write errors
          }
        }
      },
    };
  },
};