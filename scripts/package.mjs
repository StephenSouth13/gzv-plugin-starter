// Package a release for manual upload / audit: release/<id>-<version>/{manifest.json,plugin.js,SHA256SUMS}
// Run after `npm run build && npm run check`. Upload via /partner/plugins or use `npm run submit`.
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { validateManifest, scanBundle } = await import("@gzv/plugin-sdk/manifest");

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const v = validateManifest(manifest);
if (!v.ok) {
  console.error("✗ manifest invalid — run npm run check");
  process.exit(1);
}
const code = readFileSync(manifest.entry, "utf8");
if (!scanBundle(code, manifest).passed) {
  console.error("✗ bundle failed size/security scan — run npm run check");
  process.exit(1);
}
const dir = `release/${manifest.id}-${manifest.version}`;
mkdirSync(dir, { recursive: true });
copyFileSync("manifest.json", `${dir}/manifest.json`);
copyFileSync(manifest.entry, `${dir}/plugin.js`);
const sum = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
writeFileSync(
  `${dir}/SHA256SUMS`,
  `${sum(`${dir}/manifest.json`)}  manifest.json\n${sum(`${dir}/plugin.js`)}  plugin.js\n`,
);
console.log(`✓ packaged ${dir}`);
