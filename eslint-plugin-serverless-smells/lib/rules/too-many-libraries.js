"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Detect unused or over-imported libraries/packages with improved accuracy",
      category: "Best Practices",
      recommended: false,
    },
    fixable: null, // Changed from "code" to null to disable automatic fixes
    schema: [
      {
        type: "object",
        properties: {
          ignorePackages: {
            type: "array",
            items: {
              type: "string"
            }
          },
          sideEffectPackages: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Packages that are imported for their side effects (CSS, polyfills, etc.)"
          },
          minImportsForOverImportWarning: {
            type: "number",
            description: "Minimum number of imports to trigger an over-import warning"
          },
          maxPercentageForOverImportWarning: {
            type: "number",
            description: "Maximum percentage of exports used before warning is suppressed"
          },
          customExportCounts: {
            type: "object",
            additionalProperties: {
              type: "number"
            },
            description: "Custom export counts for specific libraries"
          },
          ignoreTypeImports: {
            type: "boolean",
            description: "Whether to ignore TypeScript type imports"
          },
          ignoreTestFiles: {
            type: "boolean",
            description: "Whether to ignore test files (based on filename patterns)"
          },
          testFilePatterns: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Regex patterns to identify test files"
          },
          strictLocalImports: {
            type: "boolean",
            description: "Whether to apply strict checking to local imports (false means more lenient)"
          },
          treatAsLocal: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Patterns for import paths that should be treated as local modules"
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unusedImport: "The library '{{ name }}' is imported but never used. Consider removing this import.",
      overImported: "The entire library '{{ name }}' is imported, but only {{ usedCount }} of {{ totalExports }} exports are used ({{ percentage }}%). Consider using selective imports like: {{ suggestion }}",
      unusedNamedImport: "The import '{{ importName }}' from '{{ name }}' is never used. Consider removing this import.",
      removableImport: "This import can be safely removed.",
      replaceWithSuggestion: "Replace with more specific imports."
    },
  },

  create(context) {
    // Get rule options with defaults
    const options = context.options[0] || {};
    const ignorePackages = options.ignorePackages || [];
    const sideEffectPackages = options.sideEffectPackages || [
      'react', // Has side effects on JSX
      '\\.css$', '\\.scss$', '\\.less$', '\\.sass$', // CSS modules
      '\\.svg$', '\\.png$', '\\.jpg$', '\\.jpeg$', // Images that might have side effects
      'polyfill', 'core-js', 'regenerator-runtime', // Common polyfills
    ];
    const minImportsForOverImportWarning = options.minImportsForOverImportWarning || 3;
    const maxPercentageForOverImportWarning = options.maxPercentageForOverImportWarning || 15;
    const ignoreTypeImports = options.ignoreTypeImports !== undefined ? options.ignoreTypeImports : true;
    const ignoreTestFiles = options.ignoreTestFiles !== undefined ? options.ignoreTestFiles : true;
    const testFilePatterns = options.testFilePatterns || [
      '\\.(test|spec)\\.(js|jsx|ts|tsx)$',
      'tests?/',
      '__tests?__/',
      'jest',
      'cypress',
    ];
    const strictLocalImports = options.strictLocalImports !== undefined ? options.strictLocalImports : false;
    const treatAsLocal = options.treatAsLocal || [];

    // Check if current file should be ignored (test file)
    const filename = context.getFilename();
    if (ignoreTestFiles && testFilePatterns.some(pattern => new RegExp(pattern).test(filename))) {
      return {};
    }

    // Maps to track imports and their usage
    const importMap = new Map(); // Track imported libraries
    const importBindings = new Map(); // Map import names to their libraries
    const usedImports = new Set(); // Track which imports are actually used
    const usedProperties = new Map(); // Track which properties are used from each library
    const reExportedImports = new Set(); // Track re-exported imports
    const possibleSideEffectImports = new Set(); // Track imports that might be used for side effects
    
    // Match library against regex patterns
    function matchesAnyPattern(library, patterns) {
      return patterns.some(pattern => {
        // Check if it's a plain string match
        if (!pattern.includes('$') && !pattern.includes('^') && !pattern.includes('\\')) {
          return library.includes(pattern);
        }
        // Otherwise treat as regex
        return new RegExp(pattern).test(library);
      });
    }

    // Track number of available exports for each library
    const libraryExports = new Map();
    
    // Initialize with common libraries and their approximate export counts
    const commonLibraries = {
      'react': 30,
      'react-dom': 15,
      'react-router-dom': 25,
      'lodash': 300,
      'express': 50,
      'axios': 20,
      'redux': 15,
      'react-redux': 12,
      'styled-components': 30,
      'moment': 60,
      'date-fns': 120,
      '@material-ui/core': 100,
      '@mui/material': 120
    };
    
    // Apply custom export counts
    const customExportCounts = options.customExportCounts || {};
    Object.entries({...commonLibraries, ...customExportCounts}).forEach(([lib, count]) => {
      libraryExports.set(lib, count);
    });

    /**
     * Checks if the identifier is part of an assignment or destructuring pattern
     * @param {ASTNode} node - The identifier node
     * @returns {boolean} - Whether the identifier is being assigned to
     */
    function isInAssignmentPattern(node) {
      const parent = node.parent;
      if (!parent) return false;

      // Direct assignment
      if (parent.type === 'AssignmentExpression' && parent.left === node) {
        return true;
      }

      // Destructuring patterns
      if ((parent.type === 'Property' && parent.key === node && parent.parent?.type === 'ObjectPattern') ||
          parent.type === 'ArrayPattern' ||
          parent.type === 'ObjectPattern' ||
          (parent.type === 'AssignmentPattern' && parent.left === node)) {
        return true;
      }

      return false;
    }

    /**
     * Checks if the node is part of a JSX expression
     * @param {ASTNode} node - The node to check
     * @returns {boolean} - Whether the node is in JSX
     */
    function isInJSX(node) {
      let current = node;
      while (current.parent) {
        if (current.type?.startsWith('JSX')) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    /**
     * Checks if this is a type-only import in TypeScript
     * @param {ASTNode} node - The import declaration node
     * @returns {boolean} - Whether it's a type-only import
     */
    function isTypeOnlyImport(node) {
      // Check for TypeScript's "import type" syntax
      return node.importKind === 'type';
    }

    /**
     * Generate a selective import suggestion based on used properties
     * @param {string} libraryName - The library name
     * @param {Set<string>} usedProps - Set of used properties
     * @returns {string} - A suggested import statement
     */
    function generateImportSuggestion(libraryName, usedProps) {
      const props = Array.from(usedProps);
      if (props.length === 0) return `import {} from '${libraryName}'`;
      
      // If only default is used
      if (props.length === 1 && props[0] === 'default') {
        return `import DefaultExport from '${libraryName}'`;
      }
      
      // Filter out 'default' for named imports
      const namedProps = props.filter(p => p !== 'default');
      let suggestion = '';
      
      // Add default import if needed
      if (props.includes('default')) {
        suggestion += `import DefaultExport`;
        if (namedProps.length > 0) {
          suggestion += `, `;
        }
      } else {
        suggestion += `import `;
      }
      
      // Add named imports
      if (namedProps.length > 0) {
        suggestion += `{ ${namedProps.join(', ')} }`;
      }
      
      suggestion += ` from '${libraryName}'`;
      return suggestion;
    }

    return {
      // Track imports
      ImportDeclaration(node) {
        const libraryName = node.source.value;
        
        // Skip ignored packages
        if (ignorePackages.includes(libraryName) || 
            matchesAnyPattern(libraryName, ignorePackages)) {
          return;
        }

        // Skip type-only imports if configured
        if (ignoreTypeImports && isTypeOnlyImport(node)) {
          return;
        }
        
        // Determine if this is a local import (starting with ./ or ../) 
        // or matches patterns in treatAsLocal
        const isLocalImport = libraryName.startsWith('./') || 
                            libraryName.startsWith('../') ||
                            libraryName.startsWith('/') ||
                            matchesAnyPattern(libraryName, treatAsLocal);
        
        // Check if this is likely a side-effect import
        const isSideEffect = matchesAnyPattern(libraryName, sideEffectPackages) || 
                            node.specifiers.length === 0;
        
        if (isSideEffect) {
          possibleSideEffectImports.add(libraryName);
        }
        
        // Set default export count if not already known
        if (!libraryExports.has(libraryName)) {
          libraryExports.set(libraryName, 20); // Default assumption
        }
        
        // Initialize tracking for this library
        if (!importMap.has(libraryName)) {
          importMap.set(libraryName, { 
            node, 
            used: false, 
            fullImport: false,
            sideEffect: isSideEffect,
            specifiers: new Map(),
            typeOnly: isTypeOnlyImport(node)
          });
        }
        
        if (!usedProperties.has(libraryName)) {
          usedProperties.set(libraryName, new Set());
        }

        // Process each import specifier
        node.specifiers.forEach(specifier => {
          if (specifier.type === "ImportNamespaceSpecifier") {
            // e.g., import * as lib from 'library'
            importMap.get(libraryName).fullImport = true;
            importBindings.set(specifier.local.name, {
              library: libraryName,
              isNamespace: true,
              node: specifier
            });
            importMap.get(libraryName).specifiers.set(specifier.local.name, {
              type: 'namespace',
              node: specifier,
              used: false
            });
          } 
          else if (specifier.type === "ImportDefaultSpecifier") {
            // e.g., import React from 'react'
            importBindings.set(specifier.local.name, {
              library: libraryName,
              isNamespace: false,
              imported: 'default',
              node: specifier
            });
            importMap.get(libraryName).specifiers.set(specifier.local.name, {
              type: 'default',
              node: specifier,
              used: false
            });
          }
          else if (specifier.type === "ImportSpecifier") {
            // e.g., import { useState } from 'react'
            const importedName = specifier.imported.name;
            const localName = specifier.local.name;
            
            importBindings.set(localName, {
              library: libraryName,
              isNamespace: false,
              imported: importedName,
              node: specifier
            });
            importMap.get(libraryName).specifiers.set(localName, {
              type: 'named',
              importedName,
              node: specifier,
              used: false
            });
          }
        });
      },

      // Track CommonJS requires
      VariableDeclarator(node) {
        // Look for patterns like const x = require('lib')
        if (node.init && 
            node.init.type === 'CallExpression' && 
            node.init.callee.type === 'Identifier' && 
            node.init.callee.name === 'require' &&
            node.init.arguments.length > 0 &&
            node.init.arguments[0].type === 'Literal') {
          
          const libraryName = node.init.arguments[0].value;
          
          // Skip ignored packages
          if (ignorePackages.includes(libraryName) || 
              matchesAnyPattern(libraryName, ignorePackages)) {
            return;
          }
          
          // Add to importMap
          if (!importMap.has(libraryName)) {
            importMap.set(libraryName, { 
              node: node, 
              used: false, 
              fullImport: true,
              sideEffect: matchesAnyPattern(libraryName, sideEffectPackages),
              specifiers: new Map()
            });
          }
          
          if (!usedProperties.has(libraryName)) {
            usedProperties.set(libraryName, new Set());
          }
          
          // Handle different require patterns
          if (node.id.type === 'Identifier') {
            // const lib = require('lib')
            importBindings.set(node.id.name, {
              library: libraryName,
              isNamespace: true,
              node: node
            });
            importMap.get(libraryName).specifiers.set(node.id.name, {
              type: 'namespace',
              node: node,
              used: false
            });
          } 
          else if (node.id.type === 'ObjectPattern') {
            // const { x, y } = require('lib')
            node.id.properties.forEach(prop => {
              if (prop.key.type === 'Identifier' && prop.value.type === 'Identifier') {
                const importedName = prop.key.name;
                const localName = prop.value.name;
                
                importBindings.set(localName, {
                  library: libraryName,
                  isNamespace: false,
                  imported: importedName,
                  node: prop
                });
                importMap.get(libraryName).specifiers.set(localName, {
                  type: 'named',
                  importedName,
                  node: prop,
                  used: false
                });
              }
            });
          }
        }
      },
      
      // Track dynamic imports
      CallExpression(node) {
        if (node.callee.type === 'Import') {
          // This is a dynamic import: import('lib')
          if (node.arguments.length > 0 && node.arguments[0].type === 'Literal') {
            const libraryName = node.arguments[0].value;
            
            // Skip ignored packages
            if (ignorePackages.includes(libraryName) || 
                matchesAnyPattern(libraryName, ignorePackages)) {
              return;
            }
            
            // Mark as used since dynamic imports are typically used
            if (!importMap.has(libraryName)) {
              importMap.set(libraryName, { 
                node: node, 
                used: true, 
                fullImport: true,
                sideEffect: matchesAnyPattern(libraryName, sideEffectPackages),
                specifiers: new Map(),
                isDynamic: true
              });
            } else {
              importMap.get(libraryName).used = true;
            }
          }
        }
      },
      
      // Track export statements to detect re-exports
      ExportNamedDeclaration(node) {
        if (node.specifiers && node.specifiers.length > 0) {
          node.specifiers.forEach(specifier => {
            if (specifier.local && specifier.local.type === 'Identifier') {
              // This is a re-export
              reExportedImports.add(specifier.local.name);
            }
          });
        }
      },

      ExportAllDeclaration(node) {
        if (node.source && node.source.value) {
          // Export all from a module - mark it as used
          const libraryName = node.source.value;
          if (importMap.has(libraryName)) {
            importMap.get(libraryName).used = true;
          }
        }
      },
      
      // Track variable usage
      Identifier(node) {
        // Skip if in import/export declarations to avoid counting the import itself
        if (node.parent && 
            (node.parent.type === "ImportSpecifier" || 
             node.parent.type === "ImportDefaultSpecifier" ||
             node.parent.type === "ImportNamespaceSpecifier" ||
             node.parent.type === "ExportSpecifier")) {
          return;
        }
        
        // Skip if in an assignment context since we're defining not using
        if (isInAssignmentPattern(node)) {
          return;
        }
        
        const name = node.name;
        
        // Check if this identifier corresponds to an import
        if (importBindings.has(name)) {
          const binding = importBindings.get(name);
          const importData = importMap.get(binding.library);
          
          // Mark as used
          importData.used = true;
          importData.specifiers.get(name).used = true;
          usedImports.add(name);
          
          // If this is a default or named import, track it
          if (!binding.isNamespace) {
            usedProperties.get(binding.library).add(binding.imported);
          }
        }
      },
      
      // Track property access on imported namespace objects
      MemberExpression(node) {
        if (node.object.type === "Identifier" && importBindings.has(node.object.name)) {
          const binding = importBindings.get(node.object.name);
          const importData = importMap.get(binding.library);
          
          // Mark the library and specific import as used
          importData.used = true;
          if (importData.specifiers.has(node.object.name)) {
            importData.specifiers.get(node.object.name).used = true;
          }
          usedImports.add(node.object.name);
          
          // If this is a namespace import, track which property is being used
          if (binding.isNamespace) {
            // Handle both static and computed properties
            if (node.property.type === "Identifier" && !node.computed) {
              usedProperties.get(binding.library).add(node.property.name);
            } else if (node.property.type === "Literal") {
              usedProperties.get(binding.library).add(String(node.property.value));
            }
            
            // Track deeper property access
            // E.g., for lodash.fp.compose, we've handled lodash.fp here,
            // and will handle the .compose part in a parent MemberExpression
          }
        } 
        // Handle deeper nested property access (e.g., lodash.fp.compose)
        else if (node.object.type === "MemberExpression") {
          let currentNode = node.object;
          let path = [];
          
          // Build the property path
          while (currentNode.type === "MemberExpression") {
            if (currentNode.property.type === "Identifier" && !currentNode.computed) {
              path.unshift(currentNode.property.name);
            } else if (currentNode.property.type === "Literal") {
              path.unshift(String(currentNode.property.value));
            }
            currentNode = currentNode.object;
          }
          
          // Check if the root object is an import
          if (currentNode.type === "Identifier" && importBindings.has(currentNode.name)) {
            const binding = importBindings.get(currentNode.name);
            const importData = importMap.get(binding.library);
            
            // Mark as used
            importData.used = true;
            if (importData.specifiers.has(currentNode.name)) {
              importData.specifiers.get(currentNode.name).used = true;
            }
            usedImports.add(currentNode.name);
            
            // If this is a namespace import, track the full property path
            if (binding.isNamespace) {
              // Add current property
              if (node.property.type === "Identifier" && !node.computed) {
                path.push(node.property.name);
              } else if (node.property.type === "Literal") {
                path.push(String(node.property.value));
              }
              
              // Add the full property path (e.g., "fp.compose")
              if (path.length > 0) {
                usedProperties.get(binding.library).add(path.join('.'));
              }
            }
          }
        }
      },
      
      // Track JSX usage which often indicates React is being used
      JSXOpeningElement(node) {
        // For any JSX usage, mark React as used if it's imported
        if (importMap.has('react')) {
          importMap.get('react').used = true;
          
          // Also mark the actual React import as used
          for (const [name, binding] of importBindings.entries()) {
            if (binding.library === 'react') {
              usedImports.add(name);
              if (importMap.get('react').specifiers.has(name)) {
                importMap.get('react').specifiers.get(name).used = true;
              }
            }
          }
        }
        
        // Check for imported components used in JSX
        if (node.name.type === "JSXIdentifier") {
          const tagName = node.name.name;
          
          // Only consider PascalCase components which might be imports
          if (tagName[0] === tagName[0].toUpperCase() && importBindings.has(tagName)) {
            const binding = importBindings.get(tagName);
            importMap.get(binding.library).used = true;
            importMap.get(binding.library).specifiers.get(tagName).used = true;
            usedImports.add(tagName);
          }
        } else if (node.name.type === "JSXMemberExpression") {
          // Handle component access like Lib.Component
          let currentNode = node.name;
          let rootObject = null;
          
          while (currentNode.type === "JSXMemberExpression") {
            rootObject = currentNode.object;
            currentNode = currentNode.object;
          }
          
          if (rootObject && rootObject.type === "JSXIdentifier" && importBindings.has(rootObject.name)) {
            const binding = importBindings.get(rootObject.name);
            importMap.get(binding.library).used = true;
            importMap.get(binding.library).specifiers.get(rootObject.name).used = true;
            usedImports.add(rootObject.name);
          }
        }
      },
      
      // Handle function calls that might pass imports as arguments
      CallExpression(node) {
        // Check each argument to see if it's an import
        node.arguments.forEach(arg => {
          if (arg.type === "Identifier" && importBindings.has(arg.name)) {
            const binding = importBindings.get(arg.name);
            importMap.get(binding.library).used = true;
            importMap.get(binding.library).specifiers.get(arg.name).used = true;
            usedImports.add(arg.name);
          }
        });
      },
      
      'Program:exit': function () {
        // After processing the entire file, report issues
        for (const [library, data] of importMap.entries()) {
          // Skip side effect imports, dynamic imports, and type-only imports
          if (data.sideEffect || data.isDynamic || data.typeOnly) {
            continue;
          }
          
          // Determine if this is a local import (starting with ./ or ../)
          const isLocalImport = library.startsWith('./') || 
                              library.startsWith('../') ||
                              library.startsWith('/') ||
                              matchesAnyPattern(library, treatAsLocal);
          
          // Specialized tracking for local imports
          if (isLocalImport) {
            // Check if any specifier from this module is used
            let anySpecifierUsed = false;
            for (const [, specifierData] of data.specifiers.entries()) {
              if (specifierData.used) {
                anySpecifierUsed = true;
                break;
              }
            }
            
            // For local imports, we'll only report if no specifier is used at all
            // This helps avoid false positives with re-exports and complex module structures
            if (!data.used && !anySpecifierUsed) {
              context.report({
                node: data.node,
                messageId: "unusedImport",
                data: { name: library }
                // No fix provided
              });
            }
            
            // If strictLocalImports is true, also check individual specifiers
            if (strictLocalImports) {
              for (const [importName, specifierData] of data.specifiers.entries()) {
                if (!specifierData.used && !reExportedImports.has(importName)) {
                  context.report({
                    node: specifierData.node,
                    messageId: "unusedNamedImport",
                    data: { 
                      importName,
                      name: library
                    }
                    // No fix provided
                  });
                }
              }
            }
            
            continue; // Skip the rest of the checks for local imports
          }
          
          // For non-local imports (npm packages), apply stricter checks
          if (!data.used) {
            context.report({
              node: data.node,
              messageId: "unusedImport",
              data: { name: library }
              // No fix provided
            });
          } else {
            // Check for unused specifiers in otherwise used libraries
            for (const [importName, specifierData] of data.specifiers.entries()) {
              if (!specifierData.used && !reExportedImports.has(importName)) {
                context.report({
                  node: specifierData.node,
                  messageId: "unusedNamedImport",
                  data: { 
                    importName,
                    name: library
                  }
                  // No fix provided
                });
              }
            }
            
            // Check for over-imported libraries
            if (data.fullImport) {
              const usedCount = usedProperties.get(library).size;
              const totalExports = libraryExports.get(library);
              const usagePercentage = Math.round((usedCount / totalExports) * 100);
              
              // Only report if we're using few exports from a large library
              if (usedCount >= minImportsForOverImportWarning && 
                  usedCount < totalExports * (maxPercentageForOverImportWarning / 100)) {
                
                // Generate a better import suggestion
                const suggestion = generateImportSuggestion(
                  library, 
                  usedProperties.get(library)
                );
                
                context.report({
                  node: data.node,
                  messageId: "overImported",
                  data: { 
                    name: library,
                    usedCount: usedCount,
                    totalExports: totalExports,
                    percentage: usagePercentage,
                    suggestion
                  }
                  // No fix provided
                });
              }
            }
          }
        }
      },
    };
  },
};