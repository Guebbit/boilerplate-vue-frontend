---
source: tests/unit/kernel/module-setup.spec.ts
sha256: 112c4957f5d4e3428a5bbae8dba1a685239a9705109f4b7fda31099a1e0a98ee
signature: ec5aa9e48e2bb54bfb62fbbf0341aa297875ad47a671816c306575be47f5523f
generated_at: 2026-11-10T08:09:35.946240+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/module-setup.spec.ts

## Purpose

Unit tests for `runModuleSetups` (exported from `@/kernel/registry`), verifying that `main.ts`'s post-mount hook invokes each enabled module's boot work exactly once, leaves disabled modules untouched, and tolerates modules that declare no `setup` function.

## Key elements

- **`moduleWith(name, setup?)`** – Local factory that returns a minimal `AppModule` object with an empty `routes` array and an optional `setup` function. Keeps test fixtures to the bare minimum the code under test actually reads.
- **`describe('runModuleSetups')`** – Two test cases:
  - *"runs the setup of every enabled module exactly once, and never a disabled one"* – Spies on two enabled modules' `setup` via `vi.fn()`, passes them to `runModuleSetups`, and asserts each was called exactly once while a third (excluded) module's spy was never invoked.
  - *"skips a module that has no boot work"* – Passes a single module with no `setup` property and asserts no exception is thrown.

## Relationships

No external files are imported beyond the Vitest framework and the `@/kernel/registry` module under test. The file has no graph neighbors in the dependency graph.

## Notes

- The "disabled" module is simply *not included* in the array passed to `runModuleSetups`; it is not flagged with an `enabled: false` property. This mirrors the real pattern where a deleted module folder drops out of the enabled list entirely.
- `moduleWith` conditionally spreads `setup` so the resulting object has no `setup` key at all (rather than `setup: undefined`), which is the shape the production code must handle.
