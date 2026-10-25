// Submit the built version to GZV for review. Needs GZV_PARTNER_KEY (ppk_…).
import { readFileSync } from "node:fs";

const key = process.env.GZV_PARTNER_KEY;
const api = process.env.GZV_API ?? "https://webservice.gzv.one";
if (!key) {
  console.error("GZV_PARTNER_KEY is not set");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const res = await fetch(`${api}/api/plugins/partner`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
  body: JSON.stringify({
    op: "submit",
    manifest,
    bundle: readFileSync(manifest.entry, "utf8"),
    changelog: process.env.GZV_CHANGELOG ?? "",
    draft: process.env.GZV_DRAFT === "1",
  }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("✗ submit failed:", body.error ?? res.status);
  process.exit(1);
}
console.log(`✓ submitted ${manifest.id}@${body.version} → ${body.status}`);
