const crypto = require("crypto");

// Global storage for function signatures across all files
// Note: This will persist for the entire ESLint run
const globalFunctionSignatures = new Map();

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Detect redundant functions with duplicate code blocks across files.",
      category: "Best Practices",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          minLines: {
            type: "integer",
            default: 3,
            description: "Minimum number of lines for a function to be checked"
          },
          ignoreComments: {
            type: "boolean",
            default: true,
            description: "Whether to ignore comments when comparing functions"
          },
          ignoreSimpleFunctions: {
            type: "boolean", 
            default: true,
            description: "Ignore very simple functions like getters/setters"
          },
          clearCache: {
            type: "boolean",
            default: false,
            description: "Clear the global cache before running (useful for repeated runs)"
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      duplicateFunction:
        "The function '{{ name1 }}' at line {{ line1 }} has duplicate logic as '{{ name2 }}' at line {{ line2 }} in file '{{ file2 }}'.\n\nDuplicate code:\n{{ codeSnippet }}",
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const minLines = options.minLines || 5;
    const ignoreComments = options.ignoreComments !== false;
    const ignoreSimpleFunctions = options.ignoreSimpleFunctions !== false;
    const clearCache = options.clearCache || false;
    
    // Clear global cache if requested
    if (clearCache) {
      globalFunctionSignatures.clear();
    }
    
    const currentFilename = context.getFilename();

    /**
     * Generate a unique hash for the code body of a function.
     * @param {string} codeBody - The function body to hash.
     * @returns {string} - The generated hash.
     */
    function generateHash(codeBody) {
      let normalizedCode = codeBody;
      
      if (ignoreComments) {
        normalizedCode = normalizedCode
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '');
      }
      
      normalizedCode = normalizedCode.replace(/\s+/g, ' ').trim();
      
      return crypto.createHash("md5").update(normalizedCode).digest("hex");
    }

    /**
     * Determines if a function should be ignored for duplicate detection
     */
    function shouldIgnoreFunction(code, lineCount) {
      if (lineCount < minLines) {
        return true;
      }
      
      if (ignoreSimpleFunctions) {
        const simpleGetterSetterPattern = /^\s*{\s*return [^;]+;\s*}\s*$/;
        const simpleAssignmentPattern = /^\s*{\s*this\.[^ ]+ = [^;]+;\s*}\s*$/;
        
        if (simpleGetterSetterPattern.test(code) || simpleAssignmentPattern.test(code)) {
          return true;
        }
      }
      
      return false;
    }

    /**
     * Extract function name from various node types
     */
    function getFunctionName(node) {
      if (node.id && node.id.name) {
        return node.id.name;
      }
      
      if (node.parent && node.parent.type === "VariableDeclarator" && node.parent.id) {
        return node.parent.id.name;
      }
      
      if (node.parent && node.parent.type === "Property" && node.parent.key) {
        if (node.parent.key.name) {
          return node.parent.key.name;
        }
        if (node.parent.key.value) {
          return node.parent.key.value;
        }
      }
      
      if (node.parent && node.parent.type === "MethodDefinition" && node.parent.key) {
        return node.parent.key.name || "Class method";
      }
      
      if (node.parent && 
          node.parent.type === "AssignmentExpression" && 
          node.parent.left && 
          node.parent.left.type === "MemberExpression") {
        if (node.parent.left.property && node.parent.left.property.name) {
          return node.parent.left.property.name;
        }
      }
      
      return "Anonymous function";
    }

    /**
     * Get a short filename for display purposes
     */
    function getShortFilename(filename) {
      const parts = filename.split(/[/\\]/);
      return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : filename;
    }

    /**
     * Process a function node to check for duplicates across files
     */
    function checkFunction(node) {
      const sourceCode = context.getSourceCode();
      const functionBody = sourceCode.getText(node.body);
      const lineCount = node.loc.end.line - node.loc.start.line + 1;
      
      if (shouldIgnoreFunction(functionBody, lineCount)) {
        return;
      }
      
      const functionHash = generateHash(functionBody);
      const functionLine = node.loc.start.line;
      const functionName = getFunctionName(node);

      if (globalFunctionSignatures.has(functionHash)) {
        // Duplicate found in another file
        const { name, line, filename } = globalFunctionSignatures.get(functionHash);
        
        // Only report if it's actually a different file
        if (filename !== currentFilename) {
          context.report({
            node,
            messageId: "duplicateFunction",
            data: {
              name1: functionName,
              line1: functionLine,
              name2: name,
              line2: line,
              file2: getShortFilename(filename),
              codeSnippet: functionBody.trim().substring(0, 300) + 
                (functionBody.length > 300 ? "..." : ""),
            },
          });
        }
      } else {
        // Store the function hash, name, line number, and filename
        globalFunctionSignatures.set(functionHash, {
          name: functionName,
          line: functionLine,
          filename: currentFilename,
        });
      }
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression(node) {
        if (node.body.type === "BlockStatement") {
          checkFunction(node);
        }
      },
    };
  },
};