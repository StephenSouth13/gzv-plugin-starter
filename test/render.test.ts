import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, readable } from "../src/index.ts";

test("esc escapes HTML", () => {
  assert.equal(esc(`<a href="x">'&</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&lt;/a&gt;");
  assert.equal(esc(undefined), "");
});

test("readable picks contrasting text color", () => {
  assert.equal(readable("#ffffff"), "#111");
  assert.equal(readable("#000000"), "#fff");
  assert.equal(readable("nope"), "#fff");
});
