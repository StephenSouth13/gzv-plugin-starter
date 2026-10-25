import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("manifest has required fields", () => {
  const m = JSON.parse(readFileSync("manifest.json", "utf8"));
  assert.match(m.id, /^[a-z0-9]+(\.[a-z0-9-]+)+$/);
  assert.match(m.version, /^\d+\.\d+\.\d+/);
  assert.ok(Array.isArray(m.scopes));
  assert.ok(m.budget.jsKb <= 100);
});

test("bundle is built, self-contained and does not touch cookies/eval", () => {
  assert.ok(existsSync("dist/plugin.js"), "run npm run build first");
  const code = readFileSync("dist/plugin.js", "utf8");
  assert.ok(!/document\.cookie/.test(code));
  assert.ok(!/\beval\s*\(/.test(code));
  assert.ok(!/\bimport\s*\(/.test(code), "no dynamic imports — bundle everything");
});
