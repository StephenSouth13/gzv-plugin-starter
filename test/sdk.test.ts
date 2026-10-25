import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateManifest,
  scanBundle,
  compareSemver,
  MAX_BUNDLE_KB,
  PLUGIN_SCOPES,
  ACTION_SCOPES,
} from "@gzv/plugin-sdk";

const sample = () => JSON.parse(readFileSync("manifest.json", "utf8"));

test("sample manifest validates", () => {
  const r = validateManifest(sample());
  assert.equal(r.ok, true, JSON.stringify(r));
});

test("rejects bad id, version, unknown scope and over-budget", () => {
  const m = { ...sample(), id: "Bad ID", version: "1.0", scopes: ["root:all"], budget: { jsKb: MAX_BUNDLE_KB + 1 } };
  const r = validateManifest(m);
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.length >= 4);
});

test("network origins require network:external", () => {
  const r = validateManifest({ ...sample(), network: ["https://api.example.com"] });
  assert.equal(r.ok, false);
  const ok = validateManifest({ ...sample(), scopes: [...sample().scopes, "network:external"], network: ["https://api.example.com"] });
  assert.equal(ok.ok, true);
});

test("reserved scopes produce a warning", () => {
  const r = validateManifest({ ...sample(), scopes: ["identity:verify"] });
  assert.ok(r.warnings.some((w) => w.includes("identity:verify")));
});

test("every client action maps to a known scope", () => {
  for (const s of Object.values(ACTION_SCOPES)) assert.ok(s in PLUGIN_SCOPES);
});

test("scanBundle flags forbidden patterns and size", () => {
  assert.equal(scanBundle("console.log(1)", { budget: { jsKb: 1 } }).passed, true);
  const bad = scanBundle("eval('x'); document.cookie", { budget: { jsKb: 10 } });
  assert.equal(bad.passed, false);
  assert.equal(bad.findings.length, 2);
  assert.equal(scanBundle("x".repeat(3000), { budget: { jsKb: 1 } }).withinBudget, false);
});

test("compareSemver", () => {
  assert.ok(compareSemver("1.2.0", "1.10.0") < 0);
  assert.equal(compareSemver("2.0.0", "2.0.0"), 0);
  assert.ok(compareSemver("2.0.1", "2.0.0") > 0);
});
