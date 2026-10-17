---
source: src/modules/cart/tests/checkout-errors.spec.ts
sha256: e6f663ca382aef0e97436f0378ee54e120707f911a688882636be2d9a8a05bdc
generated_at: 2026-10-17T00:39:07.174913+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/checkout-errors.spec.ts

## Purpose

Pure unit tests for `classifyCheckoutError`, the cart domain function that maps an arbitrary checkout rejection (HTTP-shaped object, `Error`, string, or `undefined`) to a typed verdict the view can act on. The file exists to pin down the classification contract—including how malformed or missing `details` are handled—without any component mounting, Pinia store, or network layer.

## Key elements

- **`classifyCheckoutError`** (imported from `../domain`) — the single SUT. Takes a rejection value; returns a discriminated-union verdict object (`{ kind, … }`).
- **Verdict kinds exercised** — `cart-changed`, `total-changed`, `address-not-found`, `billing-address-required`, `shipping-method-weight`, `ship-to-country-not-supported`, `insufficient-stock`, `product-unavailable`, `open-order-limit`, `cart-empty`, `in-flight`, `server-error`, `other`.
- **Malformed-input coverage** — several `it` blocks specifically assert that missing/mistyped `details` (e.g. `details` absent, `expected` as a string, a shortfall line missing `requested`, an unavailable line missing `productId`) produce a valid verdict with empty/`undefined` fields rather than throwing.
- **Non-object rejection coverage** — `Error` instances, bare strings, and `undefined` all resolve to `{ kind: 'other' }`.

## Relationships

- **`src/modules/cart/domain/checkout-errors.ts`** — contains the `classifyCheckoutError` implementation under test. This spec is its sole unit-test counterpart.
- **`src/modules/cart/domain/index.ts`** — the barrel re-export the spec imports from (`import { classifyCheckoutError } from '../domain'`), keeping the test decoupled from the concrete file path.

## Notes

- The test header comment explicitly contrasts this file with `cart-view.spec.ts`: this spec proves the *verdict is correct*; the view spec proves the *view reacts correctly* to the verdict. Do not add view-level assertions here.
- `CART_TOTAL_CHANGED` is the one code whose verdict carries two sub-objects (`expected`, `actual`). When `details` is missing or structurally wrong, both are `undefined`—not omitted. Tests assert with `toEqual`, so key presence matters.
- `CART_PRODUCT_UNAVAILABLE` lines may legitimately lack `title` (hard-deleted product); the classifier sets `title: undefined` rather than dropping the line. By contrast, a line missing `productId` *is* dropped.
- A bare HTTP 500 is classified as `server-error` (the order may or may not have been written), while a 503 is deliberately *not*—it maps to `other`. Do not "fix" this to `server-error`.
- `CART_OPEN_ORDER_LIMIT` filters `orderIds` to string values only; numeric entries in the array are silently dropped.
