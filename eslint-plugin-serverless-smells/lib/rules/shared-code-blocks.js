"use strict";

const fs = require("fs");
const path = require("path");

// Global state to track imports across all files in a linting session
const globalSharedImports = new Map(); // { resolvedPath: importData }
const allImportsByFile = new Map(); // Track all imports per file for final reporting
const reportedImports = new Set(); // Track which imports we've already reported globally
const processedFiles = new Set(); // Track which files have been processed
let isFirstRun = true; // Flag to reset state on new linting sessions

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Detect shared imports among serverless functions",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          reset: {
            type: "boolean",
            default: false
          },
          minSharedCount: {
            type: "integer",
            minimum: 2,
            default: 2
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      sharedImport:
        "Import '{{ importPath }}' is being shared among 2 or more files files. Consider consolidating if appropriate.",
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const minSharedCount = options.minSharedCount || 2;
    const currentFilePath = context.getFilename();
    
    // Reset global state if this is a new linting session or reset is requested
    if (isFirstRun || options.reset) {
      globalSharedImports.clear();
      allImportsByFile.clear();
      reportedImports.clear();
      processedFiles.clear();
      isFirstRun = false;
    }

    // Initialize tracking for this file
    if (!allImportsByFile.has(currentFilePath)) {
      allImportsByFile.set(currentFilePath, new Map());
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        
        // Only process relative imports
        if (source.startsWith("./") || source.startsWith("../")) {
          try {
            // Resolve the absolute path of the imported module
            const resolvedPath = path.resolve(path.dirname(currentFilePath), source);
            
            // Use the resolved absolute path as the key
            const importKey = resolvedPath;

            // Initialize tracking for this import if not exists
            if (!globalSharedImports.has(importKey)) {
              globalSharedImports.set(importKey, {
                importPath: source,
                resolvedPath: resolvedPath,
                importingFiles: new Set(),
                importNodes: new Map()
              });
            }

            // Add current file to the set of files importing this module
            const importData = globalSharedImports.get(importKey);
            importData.importingFiles.add(currentFilePath);
            importData.importNodes.set(currentFilePath, node);

            // Store import info for this file
            allImportsByFile.get(currentFilePath).set(importKey, {
              node: node,
              importPath: source,
              resolvedPath: resolvedPath
            });
          } catch (error) {
            // Skip if path resolution fails
            console.warn(`Failed to resolve path: ${source} from ${currentFilePath}`);
          }
        }
      },

      "Program:exit"() {
        // Mark this file as processed
        processedFiles.add(currentFilePath);
        
        // Only report shared imports that haven't been reported yet and meet threshold
        const currentFileImports = allImportsByFile.get(currentFilePath) || new Map();
        
        for (const [importKey, fileImportData] of currentFileImports.entries()) {
          const globalImportData = globalSharedImports.get(importKey);
          
          if (globalImportData && (globalImportData.importingFiles.size >= minSharedCount && !reportedImports.has(importKey))) {
            
            // Mark as reported to prevent future reports
            reportedImports.add(importKey);
            
            const fileList = Array.from(globalImportData.importingFiles)
              .sort()
              .map(f => path.relative(process.cwd(), f))
              .join(", ");

            // Report from the first file that imports this shared module
            const firstImportingFile = Array.from(globalImportData.importingFiles)[0];
            const firstFileImports = allImportsByFile.get(firstImportingFile);
            const reportNode = firstFileImports ? firstFileImports.get(importKey)?.node : fileImportData.node;

            context.report({
              node: reportNode || fileImportData.node,
              messageId: "sharedImport",
              data: { 
                importPath: fileImportData.importPath,
                count: globalImportData.importingFiles.size,
                files: fileList
              }
            });
          }
        }
      },
    };
  },
};

// Export function to manually reset state (useful for testing)
module.exports.resetState = function() {
  globalSharedImports.clear();
  allImportsByFile.clear();
  reportedImports.clear();
  processedFiles.clear();
  isFirstRun = true;
};