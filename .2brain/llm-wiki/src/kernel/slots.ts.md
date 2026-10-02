---
source: src/kernel/slots.ts
sha256: cd361e54e2504745aae31d6b23ecc63bc5fc7de2b6132adf08790f418bf4cfad
generated_at: 2026-10-02T12:07:57.878697+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/slots.ts

## Purpose

Defines the slot-based extension-point mechanism that decouples contributing modules from the modules that render their components. A module **owns** a slot (a fixed place in its view); other modules **contribute** components to it via their manifest. The owner reads the slot and renders whatever arrived, so the owner never imports its contributors — the dependency runs contributor → owner.

## Key elements

- **`SlotName`** — Closed union of every valid slot name (`'product-actions'`). Adding a new slot name is the only way to create a new extension point.
- **`Slots`** — `Partial<Record<SlotName, Component[]>>`; the shape of the collected contributions map (slot name → ordered component array).
- **`SLOTS_KEY`** — A `Symbol`-backed `InjectionKey<Slots>` used with Vue's `provide`/`inject`. The composition root provides the collected `Slots` under this key.
- **`useSlot(name)`** — Composable that reads the injected `Slots` and returns `Component[]` for the given slot, falling back to an empty array when nothing was provided or contributed.

## Notes

- The kernel itself does **not** import Pinia or know what any slot's component does; it only supplies the injection key and the `useSlot` reader.
- A slot name is added to `SlotName` only when a **second** module needs to contribute to it (see `docs/theory/layers.md`). Single-consumer cases should not create a named slot.
- Component order within a slot reflects module order (as assembled by the composition root's `collectModuleSlots` call, which lives outside this file).
- Each slot's owner documents the props its contributed components receive (e.g., `product-actions` passes `{ product }`). This contract is implicit and enforced by convention, not by a type in this file.
