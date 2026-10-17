---
source: src/modules/orders/tests/hard-delete-domain.spec.ts
sha256: 422727885b3eb43a4728d38a01ed05635a8e95db3d08fb75c61f5554f190f3a0
generated_at: 2026-10-17T01:17:31.453416+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/hard-delete-domain.spec.ts

## Purpose

Unit test suite (Vitest) for the `canHardDelete` domain rule. It verifies the single business invariant that an order may be permanently deleted only when it is both **cancelled** and **unpaid**, and that any other combination is rejected.

## Key elements

- **`describe('canHardDelete')`** — top-level group; all tests exercise the pure `canHardDelete(order)` predicate.
- **`'accepts a cancelled order that was never paid'`** — positive case: `{ status: 'cancelled', paymentStatus: 'unpaid' }` → `true`.
- **`'refuses an order that is still open'`** — negative case: `{ status: 'pending', paymentStatus: 'unpaid' }` → `false`.
- **`it.each(['paid', 'partially_refunded', 'refunded'])`** — parameterized negative cases: a cancelled order with any post-payment state is rejected → `false`.

## Relationships

- **`src/modules/orders/domain/index.ts`** — barrel re-export; the spec imports `canHardDelete` from `'../domain'`, which resolves to this index file.
- **`src/modules/orders/domain/hard-delete.ts`** — declares the `canHardDelete` predicate under test; the spec exercises its pure logic with no mocking.

## Notes

- Tests are fully synchronous and stateless — no mocks, fixtures, or async I/O. They assert on a plain object, so any change to the shape of the order parameter (e.g., adding a required field) will break compilation here.
- The `it.each` block deliberately covers every payment status *except* `'unpaid'`, so adding a new `paymentStatus` literal to the domain will require a matching test case to keep coverage complete.
