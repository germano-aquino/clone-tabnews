const { spawn, execSync } = require("node:child_process");

function runServerSafely() {
  const command = "npm";
  const args = ["run", "dev"];

  const child = spawn(command, args, {
    env: { ...process.env, FORCE_COLOR: "true" },
    stdio: "inherit",
  });

  child.on("close", () => {
    execSync("npm run services:stop");
  });
}

runServerSafely();

process.on("SIGINT", () => {
  console.log("\nShutting the server down gracefully.");
  execSync("npm run services:stop");
  process.exit(0);
});
