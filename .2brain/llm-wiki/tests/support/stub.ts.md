---
source: tests/support/stub.ts
sha256: 32d7f69f2bb65e0973bf6be6e9fc5ee3b487445dc2d6d5f48cf90acfddaaf0aa
generated_at: 2026-10-17T02:27:59.613573+00:00
model: ollama:qwen3.8:27b
---

# tests/support/stub.ts

## Purpose

Provides a single, named cast helper for hand-built test stubs that cannot structurally satisfy the real framework type they substitute for (e.g. a fake `RouteLocationNormalized` or `AxiosError`). It centralizes the one unavoidable type-assertion so that `as unknown as T` is never scattered across individual test suites.

## Key elements

- **`asStub<T extends object>(value: unknown): T`** — The sole export. Casts an `unknown` value to `T`. The type parameter is the call-site's declaration (`asStub<AxiosError>(stub)`), making the intent searchable and reviewer-friendly. Carries an `eslint-disable` for `@typescript-eslint/no-unnecessary-type-parameters` because the generic *is* the point.

## Relationships

Imported by test spec files across the cart, example, inventory, locales, and orders modules (e.g. `cart-view.spec.ts`, `order-view.spec.ts`, `guards.spec.ts`, `movement-ledger.spec.ts`). Each suite uses it to cast small, hand-built stub objects to the interface they need to satisfy the SUT without constructing the full framework type.

## Notes

- `no-restricted-syntax` (ESLint) bans the inline `as unknown as T` double-cast everywhere else in the repo; this file is the one sanctioned seam.
- A paired file exists in the backend repo at `tests/support/stub.ts` with identical shape, so cross-stack stubs share the same convention.
- The `T extends object` constraint prevents casting to primitives; only object-shaped stubs are supported.
