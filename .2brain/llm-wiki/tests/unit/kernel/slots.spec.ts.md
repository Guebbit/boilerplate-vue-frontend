---
source: tests/unit/kernel/slots.spec.ts
sha256: 573e676241efd79d1f66c1d7bd0dd0897d07e316f1efa6f0fd057961e030dd57
signature: df0f78707431bb83502dc73a25904513b0736d2e732c43f1e604606b7329ecf8
generated_at: 2026-11-10T08:10:27.349670+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/slots.spec.ts

## Purpose

Unit tests for the kernel's slot mechanism: verifying that `collectModuleSlots` correctly aggregates slot contributions from multiple modules, and that the `useSlot` composable renders (or renders nothing for) the slots provided at composition time. Exists to lock down the decoupled "contribute-to-a-slot / read-from-a-slot" contract without requiring a full app mount.

## Key elements

- **`Alpha` / `Beta`** – Minimal `Component` stubs (`<i>alpha</i>`, `<i>beta</i>`) used as slot content so rendered text is unambiguous.
- **`contributor(name, slots?)`** – Factory returning a bare `AppModule` (`routes: []`, optional `slots`), simulating a module that only contributes components.
- **`mountOwner(provided?)`** – Mounts a throwaway host component whose `setup` calls `useSlot('product-actions')` and renders the result array; injects `SLOTS_KEY` via Vue's `provide` when `provided` is given.
- **`describe('collectModuleSlots')`** – Two tests: (1) merges per-slot arrays preserving module order; (2) returns `{}` when no module supplies slots.
- **`describe('useSlot')`** – Three tests: (1) renders provided components in order; (2) renders empty string when nothing is provided at all; (3) renders empty string for a slot key absent from the provided object.

## Relationships

No graph neighbors are recorded. The file imports production code from `@/kernel/registry` (`collectModuleSlots`, `AppModule` type) and `@/kernel/slots` (`SLOTS_KEY`, `useSlot`, `Slots` type), but those source files are not listed as neighbors in the dependency graph.

## Notes

- The host component in `mountOwner` is created inline via `defineComponent` + `h` rather than using a template, so the test avoids any SFC compilation step.
- `SLOTS_KEY` is cast `as symbol` when used as a provide key, matching how the kernel registers it.
- The test file does **not** test slot contribution through the Vue `provide/inject` boundary (i.e., a child module pushing into a slot via injection); it only exercises the registry-level merge and the owner-side read.
