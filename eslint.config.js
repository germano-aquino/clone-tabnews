const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    files: ["**/*.js"],
    ignores: [".next/**", ".node_modules/**"],
    rules: {
      semi: "error",
      "prefer-const": "error",
    },
  },
]);
