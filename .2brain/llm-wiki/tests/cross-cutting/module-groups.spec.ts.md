---
source: tests/cross-cutting/module-groups.spec.ts
sha256: 225c4ddbf5787f529ba52ca06944e8d849d40131e1f924c29daf51c3f1e644ec
signature: 225c4ddbf5787f529ba52ca06944e8d849d40131e1f924c29daf51c3f1e644ec
generated_at: 2026-11-10T06:38:35.405787+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/module-groups.spec.ts

## Purpose

Vitest spec that enforces every enabled module explicitly declares a valid `group` in its `src/modules/<name>/module.yaml` (the "foundation | shop" axis). A missing or invalid group fails the build rather than defaulting silently, making module categorization a deliberate choice. Together with `eslint.config.ts`'s `foundation-may-not-import-shop` rule (which enforces import *direction*), this spec enforces *completeness*: every module is accounted for on the axis.

## Key elements

- **`moduleManifestProblems` (imported)** — pre-computed list of `module.yaml` parse/validation errors; the spec asserts it is empty.
- **`moduleGroups` (imported)** — map of module name → group string; the spec checks every enabled module appears as a key.
- **`moduleFolderNames` (imported)** — set of folder names under `src/modules/`; the spec asserts a 1-to-1 match with `enabledModules`.
- **`demoModuleNames()` (imported)** — returns the names of modules targeted by the `demo:remove` script; the spec asserts none belong to the `foundation` group.
- **"Guard on the guard" test** — asserts `enabledModules.length ≥ 1` and `Object.keys(moduleGroups).length ≥ 1` so an accidentally empty registry can't satisfy the other tests vacuously.

## Relationships

- **`scripts/module-manifest.ts`** — sole data source. This spec imports `demoModuleNames`, `moduleFolderNames`, `moduleGroups`, and `moduleManifestProblems` from it. That script performs the per-module configuration parsing and surfaces structural problems; this spec is the test-side consumer that turns those computed values into pass/fail assertions.

## Notes

- The "non-empty" guard uses a floor of **1**, not the current demo module count, deliberately: deleting a domain module must not also remove the canary assertion.
- `demo:remove` is documented to delete exactly the `shop` and `example` groups. The last test encodes that contract by asserting no returned name maps to `foundation`.
- This spec does **not** validate import direction (that's the ESLint rule's job); it only validates that every module *has* a group assignment so the direction rule has complete input.
