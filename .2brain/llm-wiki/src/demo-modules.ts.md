---
source: src/demo-modules.ts
sha256: becf57118493cd96876819c3d73afece5a1775099fa16b08999ccecb7c44f6a0
generated_at: 2026-10-17T00:07:48.758119+00:00
model: ollama:qwen3.8:27b
---

# src/demo-modules.ts

## Purpose

Declares the definitive list of demo-only frontend modules shipped for the pet-supply e-commerce domain. It serves as the single resolved answer to "which modules belong to the demo?", mirroring the backend's `group: shop` axis, and is intentionally kept as a standalone, import-free list rather than a per-module manifest field.

## Key elements

- **`DEMO_MODULE_NAMES`** (`as const` array) — The ten registry names of demo-only modules: `cart`, `delivery`, `inventory`, `notifications`, `orders`, `payments`, `products`, `returns`, `stats`, `wishlist`. Note: `invoicing` is deliberately absent because the frontend reads PDFs through `orders`' download link rather than owning its own module.
- **`DemoModuleName`** (type) — A union of the literal string values of `DEMO_MODULE_NAMES`, derived via `(typeof DEMO_MODULE_NAMES)[number]`.

## Relationships

No dependency-graph neighbors. This file imports nothing and (by its own doc comment) must remain that way so that `scripts/demo/demo-remove.ts` can read it via a bare `tsx` invocation outside the app/vitest bundler, where `@/` aliases and transitive module imports are unavailable.

## Notes

- **Zero imports is a hard constraint**, not a style choice. Adding any import (e.g., from `src/modules.ts`) will break `scripts/demo/demo-remove.ts`, which runs this file standalone.
- **`invoicing` is intentionally excluded.** The backend owns PDF generation under its own module; the frontend consumes that output via the `orders` module.
- **Symmetry test lives in `tests/unit/demo-modules.spec.ts`.** That spec asserts this list equals `enabledModules` (from `src/modules.ts`) in both directions, catching drift between the demo manifest and what the app actually mounts.
- The list is a plain array (not a `Set` or `Record`) so it can be read by `tsx` without any runtime dependency.
