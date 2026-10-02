---
source: src/demo-modules.ts
sha256: 444438171987eb1e3f6c63eafde512b528f06a8e6c7d1837124168fb0ea3bc49
generated_at: 2026-10-02T11:52:31.972961+00:00
model: ollama:qwen3.8:27b
---

# src/demo-modules.ts

## Purpose

Declares the canonical list of frontend modules that ship in the demo (pet-supply e-commerce) build. It is the frontend counterpart to the backend's `module.yaml#group: shop` axis, stored as a plain array because the frontend has no per-module manifest file to attach a grouping field to.

## Key elements

- **`DEMO_MODULE_NAMES`** — `readonly` tuple (`as const`) of the eight demo module registry names: `cart`, `delivery`, `inventory`, `orders`, `payments`, `products`, `returns`, `wishlist`. Mirrors the backend's `group: shop` set exactly, except `invoicing` (the frontend reads invoice PDFs via the `orders` module rather than owning its own).
- **`DemoModuleName`** — Union type of the eight string literals, derived from `DEMO_MODULE_NAMES` via indexed access on `typeof`.

## Relationships

- **`tests/unit/demo-modules.spec.ts`** — Asserts bidirectional equality between `DEMO_MODULE_NAMES` and `enabledModules` in `src/modules.ts`; a mismatch in either direction fails the suite.
- **`scripts/demo/demo-remove.ts`** — Reads this file directly via a standalone `tsx` invocation (outside the app/vitest bundler), which is why this file must remain import-free.
- **Backend `module.yaml`** — Conceptually paired; the list is intended to stay in lockstep with the `group: shop` entries, enforced by the spec above.

## Notes

- **Zero imports, by contract.** The file must not import `src/modules.ts` or anything that transitively pulls in `@/`-aliased paths. The only consumer that *needs* to run without a bundler (`scripts/demo/demo-remove.ts`) would break otherwise.
- **`as const` matters.** It gives the tuple a fixed length and makes `DemoModuleName` a closed literal union rather than `string`.
- Adding a new demo module requires updating both this list and `src/modules.ts` (or the backend manifest) in the same change, or the unit spec will fail.
