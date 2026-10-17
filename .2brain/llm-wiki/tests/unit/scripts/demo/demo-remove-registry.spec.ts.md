---
source: tests/unit/scripts/demo/demo-remove-registry.spec.ts
sha256: 663e2c05e8c2de2c39e0ff06681982467783f20d8f5be3e33a4cb6f424dbac02
generated_at: 2026-10-17T02:41:25.447771+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/demo/demo-remove-registry.spec.ts

## Purpose

Unit test suite for the four registry-editing functions in `scripts/demo/demo-remove-registry.ts`. Each test runs against a fresh temporary directory (a "scratch checkout") to verify exactly which lines a module-removal operation drops and which it leaves untouched, rather than testing against the real repo tree.

## Key elements

- **`write(relative, content)`** — test helper that creates parent directories and writes a file under the scratch root.
- **`read(relative)`** — test helper that reads a scratch file back as a UTF-8 string.
- **`beforeEach` / `afterEach`** — allocate a unique temp dir via `mkdtempSync` and tear it down with `rmSync(..., { recursive: true, force: true })` after every case.
- **`describe('removeModuleFolders')`** — asserts the function deletes the named `src/modules/<name>` folders, leaves unrelated folders intact, and returns the relative paths of both requested modules in its result array.
- **`describe('stripModuleRegistry')`** — seeds a multi-import, multi-entry registry file, calls `stripModuleRegistry` for one module, and asserts the resulting file contains only the surviving import and array entry.
- **`describe('pruneModuleEdges')`** — seeds a `MODULE_EDGES` record, calls `pruneModuleEdges` with one or more module names, and verifies that entries *keyed* by a removed module are dropped while entries whose *values* mention a removed module are preserved.
- **`describe('removeManifest')`** — asserts the function deletes both `src/demo-modules.ts` and `tests/unit/demo-modules.spec.ts` and returns their relative paths.

## Relationships

- **`scripts/demo/demo-remove-registry.ts`** — the system under test. This file imports `pruneModuleEdges`, `removeManifest`, `removeModuleFolders`, and `stripModuleRegistry` and exercises each one.
- **`tests/unit/scripts/pairing/spec-identity.spec.ts`** — listed as a graph neighbor but no import, reference, or shared fixture is visible in this file; no direct interaction.

## Notes

- **Scratch-dir isolation:** every case gets a brand-new `mkdtempSync` directory; no test relies on repo state or on another test's side-effects.
- **`removeModuleFolders` reports requested names, not only existing ones:** the first test requests `['cart', 'wishlist']` but only `cart` was created; the expected return still includes the `wishlist` path. The function's contract is "name what you were told to delete," not "name what actually existed."
- **`pruneModuleEdges` key-vs-value semantics:** removing a module strips its *key* from the edges record but does **not** scrub the module name from other modules' dependency lists (e.g., `cart: ['delivery', 'account']` survives even when `wishlist` is removed). The second test in that block exists specifically to pin this down.
- **Exact-string assertions:** most `expect(read(...)).toBe(...)` checks compare the entire file content to a hand-built expected string, so whitespace and line-ending changes in the SUT will break these tests.
