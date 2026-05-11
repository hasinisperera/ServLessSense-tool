module.exports = {
  rules: {
    "shared-code-blocks": require("./lib/rules/shared-code-blocks"),
    "too-many-libraries": require("./lib/rules/too-many-libraries"),
    "too-many-technologies": require("./lib/rules/too-many-technologies"),
    "too-many-functions": require("./lib/rules/too-many-functions"),
  },
};
