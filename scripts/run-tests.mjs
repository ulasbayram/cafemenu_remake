// Runs every regression suite in sequence and fails on the first failure.
// Pure/route tests use mock clients or PGlite; nothing touches live systems.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const suites = [
  "architecture-test.mjs",
  "core-logic-test.mjs",
  "gate-test.mjs",
  "editor-state-test.mjs",
  "logo-test.mjs",
  "social-links-test.mjs",
  "menu-items-test.mjs",
  "order-management-test.mjs",
  "enterprise-foundation-test.mjs",
  "admin-access-test.mjs",
  "erp-test.mjs",
];

const results = [];
for (const suite of suites) {
  const path = fileURLToPath(new URL(suite, import.meta.url));
  const run = spawnSync(process.execPath, [path], { stdio: ["ignore", "pipe", "pipe"] });
  const ok = run.status === 0;
  results.push({ suite, ok });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim();
  const lastLine = output.split("\n").filter(Boolean).at(-1) ?? "";
  console.log(`${ok ? "PASS" : "FAIL"}  ${suite}`);
  if (!ok) {
    console.log(output);
    break;
  } else if (lastLine.startsWith("PASS")) {
    console.log(`      ${lastLine}`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} suites passed`,
);
if (failed.length) process.exit(1);
