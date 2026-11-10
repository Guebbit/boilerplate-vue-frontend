---
source: tests/unit/scripts/demo/demo-remove-registry.spec.ts
sha256: b88768d131e07884656c6083d7bddada4889cdc336624a5f344071b173250e1d
signature: 0938825cebe8897e63dff8388c3b98f4b69b7dba7bb71d99b9a68d6d11b982b3
generated_at: 2026-11-10T08:13:34.461802+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/demo/demo-remove-registry.spec.ts

## Purpose

Unit tests for the two registry-editing functions in `scripts/demo/demo-remove-registry.ts`. Each case runs against a throwaway temp directory (scratch checkout) to verify exactly which lines a module removal drops and which it leaves untouched, without touching the real repository tree.

## Key elements

- **`write(relative, content)`** – helper that creates parent directories and writes a file under the per-test temp root.
- **`read(relative)`** – helper that reads a file back as a UTF-8 string from the temp root.
- **`beforeEach` / `afterEach`** – create a fresh `mkdtempSync` directory and recursively remove it after each test.
- **`describe('removeModuleFolders')`** – one case asserting that the function deletes the named module folders, leaves unrelated folders intact, and returns the list of paths it deleted (including paths that may not exist on disk).
- **`describe('stripModuleRegistry')`** – two cases asserting that the function removes the matching `import …` line *and* the corresponding entry in the `enabledModules` array, while leaving all other imports and entries unchanged. One case specifically covers a hyphenated folder name (`stock-alerts`) mapping to a camelCase variable (`stockAlerts`).

## Relationships

- **`scripts/demo/demo-remove-registry.ts`** – the module under test; this spec imports `removeModuleFolders` and `stripModuleRegistry` from it and exercises both with isolated file-system fixtures.

## Notes

- The `removeModuleFolders` test passes `wishlist` in the delete list even though no `wishlist` folder was created on disk, yet still expects it in the returned `deleted` array. The function reports *intended* deletions, not only successful ones—don't assume the list reflects existing paths.
- The `stripModuleRegistry` tests encode a naming convention: folder names use hyphens (`stock-alerts`) while the corresponding JS identifiers are camelCase (`stockAlerts`). The function must resolve that mapping internally.
- Tests are self-contained: no network, no repo state, no shared fixtures between cases.
