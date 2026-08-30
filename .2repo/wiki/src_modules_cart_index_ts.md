# src/modules/cart/index.ts

## Purpose

Barrel (re-export) file for the cart module. It exposes the module's public API as a single import surface so that sibling modules never reach into cart's internal files directly.

## Key elements

- **`useCartStore`** — Re-exported from `./store`; the sole public symbol of the cart module.

## Relationships

- **`src/modules/cart/store.ts`** — Source of the `useCartStore` re-export. This file is the only importable entry point into that module's internals.

## Notes

- The module docstring states a project-wide convention: a sibling module **must** import from this barrel and not from internal cart files. Enforced by convention, not by the build system.
