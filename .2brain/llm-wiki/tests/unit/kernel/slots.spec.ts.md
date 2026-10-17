---
source: tests/unit/kernel/slots.spec.ts
sha256: 573e676241efd79d1f66c1d7bd0dd0897d07e316f1efa6f0fd057961e030dd57
generated_at: 2026-10-17T02:41:12.096045+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/slots.spec.ts

## Purpose

Unit tests for the slot mechanism in the kernel: verifying that `collectModuleSlots` correctly merges per-slot contributions from multiple modules, and that `useSlot` on the owning side renders whatever the composition root provided via `SLOTS_KEY` — or renders nothing when nothing was provided.

## Key elements

- **`Alpha` / `Beta`** — minimal template components (`<i>alpha</i>`, `<i>beta</i>`) used as stand-in slot contributions.
- **`contributor(name, slots?)`** — factory returning an `AppModule` with empty routes and an optional `slots` map, simulating a module that only contributes components.
- **`mountOwner(provided?)`** — mounts a host component whose `setup` calls `useSlot('product-actions')` and renders each returned component; injects `provided` slots through `SLOTS_KEY` when given.
- **`describe('collectModuleSlots')`** — asserts merge order across modules and the empty-object case when no module supplies slots.
- **`describe('useSlot')`** — asserts rendered text equals the concatenated slot contents in order, and that the output is empty when nothing was provided or the specific slot key is absent.

## Relationships

No graph neighbors are listed. The file's testable surface is defined by its imports: `collectModuleSlots` / `AppModule` from `@/kernel/registry` and `SLOTS_KEY` / `useSlot` / `Slots` from `@/kernel/slots`.

## Notes

- The test deliberately models the "owner never imports the contributor" contract: the host component references `useSlot` by slot name string, never by direct component import.
- `SLOTS_KEY` is cast `as symbol` in the `provide` map — this mirrors how the composition root injects the map and is the only place the raw key is used in these tests.
- The `contributor` helper always sets `routes: []`, emphasizing that slot contribution is orthogonal to routing.
