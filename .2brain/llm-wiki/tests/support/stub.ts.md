---
source: tests/support/stub.ts
sha256: 32d7f69f2bb65e0973bf6be6e9fc5ee3b487445dc2d6d5f48cf90acfddaaf0aa
signature: d26e183087d4682a54920dbbf6a9e5385d2b765e7a19f43ee6507f7c9682c6e1
generated_at: 2026-11-10T07:39:16.142779+00:00
model: ollama:qwen3.8:27b
---

# tests/support/stub.ts

## Purpose

Provides a single, named escape hatch (`asStub`) for casting hand-built test stubs to framework types (e.g. `RouteLocationNormalized`, `AxiosError`) that are too large to construct fully in a test. It exists so that every test suite uses one searchable spelling instead of scattered `as unknown as T` double-casts, which a `no-restricted-syntax` rule bans elsewhere in the codebase.

## Key elements

- **`asStub<T extends object>(value: unknown): T`** — The sole export. Takes an `unknown` value and returns it typed as `T`. The type parameter is supplied by the caller (`asStub<AxiosError>(stub)`), making the intended type explicit at each call site. Carries an `eslint-disable` for `@typescript-eslint/no-unnecessary-type-parameters` because the generic is intentionally the call-site's type declaration.

## Relationships

- Imported by the following spec files, which use `asStub` to coerce their locally-built partial objects into the full framework type the component under test expects:
  - **cart:** `cart-view.spec.ts`, `cart-view-double-submit.spec.ts`, `cart-view-interleavings.spec.ts`, `cart-view-shipping-radio.spec.ts`, `cart-view-stale-refusal.spec.ts`, `expected-total.spec.ts`, `guest-cart-view.spec.ts`, `module-badge.spec.ts`, `module-badge-account-switch.spec.ts`
  - **example:** `examples-list-view.spec.ts`
  - **inventory:** `movement-ledger.spec.ts`
  - **locales:** `form-dialogs.spec.ts`
  - **orders:** `order-view.spec.ts`, `orders-list-view.spec.ts`
  - **products:** `product-fresh-stock.spec.ts`

## Notes

- The cast is intentionally narrow: `T extends object` prevents casting to primitives. If a test needs to stub a non-object type, that's a signal the test is mis-shaped.
- `no-restricted-syntax` enforces that `as unknown as T` does not appear in any other file; this module is the one place the double-cast pattern is permitted.
- When searching for a specific stub cast in review, grep for the concrete generic argument (e.g. `asStub<AxiosError>`) rather than the raw `as` keyword.
- The project docstring notes a **paired backend** repository that carries an identical `tests/support/stub.ts` with the same helper, keeping the convention consistent across the monorepo boundary.
