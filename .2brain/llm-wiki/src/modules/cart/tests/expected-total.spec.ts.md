---
source: src/modules/cart/tests/expected-total.spec.ts
sha256: 5ee30dbf2774478e88c4603f0d6d5e2cc572c4bc88c92729b404dde9c2d46103
signature: 5ee30dbf2774478e88c4603f0d6d5e2cc572c4bc88c92729b404dde9c2d46103
generated_at: 2026-11-10T04:05:25.909447+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/expected-total.spec.ts

## Purpose

Vitest spec for `checkoutFingerprint`, the pure function that derives a fingerprint string from a checkout's expected total, cart lines, and shipping selection. It verifies the fingerprint is a stable, distinguishable identifier: equal inputs yield equal outputs, and any meaningful change (total amount, line quantity, shipping method) changes the result.

## Key elements

- **`at(amount: string)`** – local helper that calls `checkoutFingerprint({ expectedTotal: { amount, currency: 'EUR' } }, cart)` with a fixed empty cart, isolating the shown-total axis.
- **"differs when only the shown total differs"** – asserts inequality for two amounts and equality for the same amount.
- **"reads a bare checkout … as no body, no lines, no shipping"** – confirms `checkoutFingerprint(undefined, undefined)` parses to `{ body: null, lines: [] }`.
- **"lists the cart lines and the shipping method …"** – confirms a populated cart yields `{ body: null, lines: [['p1', 2], shipping: 'standard' }`.
- **"differs when a line or the shipping method differs …"** – asserts the fingerprint changes when quantity or shipping selection changes while the body stays `null`.

## Relationships

- **`src/modules/cart/domain/index.ts`** – the module from which `checkoutFingerprint` is imported (`import { checkoutFingerprint } from '../domain'`).
- **`src/modules/cart/domain/checkout-attempt.ts`** – the source module that defines `checkoutFingerprint`; the spec's doc comment references it directly.
- **`tests/support/stub.ts`** – provides `asStub<T>`, used to build minimal `CartResponse` objects for each test case without constructing full fixtures.

## Notes

- The fingerprint is a **JSON string**; tests use `JSON.parse` to inspect its structure (`body`, `lines`, `shipping` fields).
- The file is explicitly **pure** (per its doc comment): no DOM mount, no store interaction, so it runs without a browser environment.
- All tested cases pass `undefined` as the checkout-attempt body, so `body` is always `null` in the parsed fingerprint; the body-differentiation path is not covered here.
