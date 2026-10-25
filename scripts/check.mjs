// Size budget + manifest validation + security scan — same rules the GZV
// server enforces at submit time, so CI fails before a reviewer ever sees it.
import { readFileSync } from "node:fs";
const { validateManifest, scanBundle } = await import("@gzv/plugin-sdk/manifest");

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const v = validateManifest(manifest);
for (const w of v.warnings) console.warn("⚠", w);
if (!v.ok) {
  for (const e of v.errors) console.error("✗ manifest:", e);
  process.exit(1);
}
const code = readFileSync(manifest.entry, "utf8");
const r = scanBundle(code, manifest);
console.log(`bundle ${r.kb} KB / budget ${r.budgetKb} KB`);
if (!r.withinBudget) console.error("✗ vượt ngân sách kích thước");
for (const f of r.findings) console.error("✗ security:", f);
if (!r.passed) process.exit(1);
console.log("✓ manifest, size budget, security scan passed");
