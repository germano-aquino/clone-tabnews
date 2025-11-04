const nextJest = require("next/jest");
const dotenv = require("dotenv");

console.log(`jest config: ${process.env.NODE_ENV}`);
dotenv.config({ path: ".env.development" });
const createJestConfig = nextJest({
  dir: ".",
});
const jestConfig = createJestConfig({
  moduleDirectories: ["node_modules", "<rootDir>"],
  testTimeout: 60000,
});

module.exports = jestConfig;
