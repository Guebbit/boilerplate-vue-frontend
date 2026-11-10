---
source: src/kernel/slots.ts
sha256: 090a24ce1049bdc7d7e51daa955286ecae9255d2ac8f9bd787141dad0fb64297
signature: b5f48af7a2cb34524894e109fb6e6bc3672614317e491aebc16f968382012215
generated_at: 2026-11-10T03:17:03.821526+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/slots.ts

## Purpose

Defines the slot-based extension mechanism that lets one module contribute UI components into a view owned by another module without either side importing the other. The composition root collects all enabled modules' contributions once and provides them for injection; slot owners simply call `useSlot` and render whatever arrives. This inverts the dependency (contributor → owner) so, e.g., `products` never needs to know `cart` exists.

## Key elements

- **`SlotName`** — Closed union of valid slot identifiers: `'product-actions'`, `'product-create-extras'`, `'app-bar'`. Adding a new slot requires extending this type.
- **`Slots`** — `Partial<Record<SlotName, Component[]>>`; the shape of the collected contributions map (slot name → array of Vue components, in module order).
- **`SLOTS_KEY`** — An `InjectionKey<Slots>` symbol (`Symbol('module-slots')`) under which the composition root provides the collected slots.
- **`useSlot(name)`** — Composable (uses Vue's `inject`) that returns the `Component[]` contributed to the named slot, or `[]` if nothing was provided.

## Relationships

No graph neighbors are listed for this file. It is a leaf in the dependency graph: it imports only from `vue` and is consumed by slot owners (views) and the composition root.

## Notes

- **Direction of dependency.** Contributors reference the owner's slot name; the owner never imports the contributor. Keep this invariant when adding new slot usages.
- **Closed union.** `SlotName` is a literal union, not a string. A typo or missing entry is a compile-time error, which is intentional.
- **Default is safe.** `useSlot` falls back to `[]`, so a view can call it unconditionally without an `if` guard.
- **Kernel ignorance.** This module intentionally knows nothing about Pinia or the internal props/behaviour of contributed components. The composition root (outside this file) handles collection and provision.
- **When to add a slot.** Per the module doc-comment, a slot only earns a name when a second module needs one (see `docs/theory/layers.md`). Avoid speculative slot names.
