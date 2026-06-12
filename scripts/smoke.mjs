// Headless smoke test: bundles the app with esbuild (already present via vite)
// and verifies menu render, seeded RNG, faction endings, life mode, and save
// serialization. Run with: npm run test:smoke
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const esbuild = require("esbuild");
mkdirSync(".smoke", { recursive: true });
esbuild.buildSync({
  entryPoints: ["scripts/smoke-entry.tsx"],
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  outfile: ".smoke/smoke.cjs",
  logLevel: "warning",
});
const run = spawnSync(process.execPath, [".smoke/smoke.cjs"], { stdio: "inherit" });
process.exit(run.status ?? 1);
