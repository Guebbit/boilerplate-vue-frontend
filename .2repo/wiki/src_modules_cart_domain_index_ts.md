# src/modules/cart/domain/index.ts

## Purpose

Barrel file that serves as the sole public entry point for the cart domain layer. It re-exports the pure business rules defined in sibling modules so that consumers (services, components, tests) import from one path rather than reaching into individual domain files. The module doc asserts a lint-enforced purity contract: no Vue, Pinia, axios, or any other tier may leak into this layer.

## Key elements

- **`MIN_LINE_QUANTITY`** — re-exported constant from `./quantity`; the lower bound for a cart line-item quantity.
- **`steppedQuantity`** — re-exported function from `./quantity`; the pure quantity-stepping rule (clamp/step logic) used when adjusting line quantities.

## Relationships

- **`src/modules/cart/domain/quantity.ts`** — sole dependency. This file re-exports both of its named exports verbatim; no transformation or wrapping is applied.

## Notes

- This file is the *only* path consumers should use to import cart domain rules. Importing `./quantity` directly from outside the domain folder bypasses the intended encapsulation and is likely flagged by lint.
- The "pure rules" contract is enforced by a lint rule (see `docs/theory/domain-layer.md`), not just convention. Adding a runtime import of a framework or HTTP client here will break the build.
- Adding a new export to the domain layer means (1) defining it in the appropriate `./<name>.ts` file and (2) adding a re-export line here. Forgetting step 2 makes the rule invisible to the rest of the codebase.
