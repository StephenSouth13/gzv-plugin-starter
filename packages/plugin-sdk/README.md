# @gzv/plugin-sdk 1.0.0

Typed SDK and manifest spec for GZV platform plugins. It is vendored here as a local npm workspace,
so the starter builds without access to the GZV platform repo. **Do not edit it.** GZV publishes
updates through this template.

- `src/client.ts`: `definePlugin`, `PluginContext`, `GzvApi`. This code runs inside the sandboxed iframe.
- `src/manifest.ts`: `validateManifest`, `scanBundle`, `compareSemver` and the scope, slot, hook and category constants. It has no dependencies and enforces the same rules as the server.

Full documentation is in the root [README](../../README.md#7-sdk-api--hooks).
