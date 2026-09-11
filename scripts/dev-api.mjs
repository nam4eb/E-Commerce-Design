import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const root = resolve(import.meta.dirname, "..");
if (existsSync(resolve(root, ".env")))
  process.loadEnvFile(resolve(root, ".env"));
if (process.env.DATABASE_FILE)
  process.env.DATABASE_FILE = resolve(root, process.env.DATABASE_FILE);
const cwd = resolve(import.meta.dirname, "../artifacts/api-server");
const env = {
  ...process.env,
  NODE_ENV: "development",
  PORT: process.env.PORT || "5000",
};
const build = spawnSync(process.execPath, ["build.mjs"], {
  cwd,
  env,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status || 1);
const server = spawnSync(
  process.execPath,
  ["--enable-source-maps", "dist/index.mjs"],
  { cwd, env, stdio: "inherit" },
);
process.exit(server.status || 0);
