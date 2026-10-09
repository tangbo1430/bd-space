import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const tasks = [
  ["lint", "../node_modules/eslint/bin/eslint.js", ["."]],
  ["types", "../node_modules/astro/astro.js", ["check"]],
  ["unit tests", "../node_modules/vitest/vitest.mjs", ["run"]],
  ["build", "../node_modules/astro/astro.js", ["build"]],
  ["release verification", "./verify-build.mjs", []],
  ["image references", "./audit-assets.mjs", []],
  ["material integrity", "./verify-materials.mjs", []],
  ["supplement integrity", "./verify-supplement.mjs", []],
];
for (const [label, path, args] of tasks) {
  console.log(`\nChecking ${label}…`);
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL(path, import.meta.url)), ...args],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("\nAll project checks passed.");
