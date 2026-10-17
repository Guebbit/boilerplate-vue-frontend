---
source: src/modules/cart/tests/guest-cart-input-validation.spec.ts
sha256: 03c4a35c9877bd7d1c0a65e001d5e0df95f0a4781ec16d9b3a1a3d09513f512b
generated_at: 2026-10-17T00:40:06.034547+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart-input-validation.spec.ts

## Purpose

Property-based tests (fast-check) that verify the guest cart's quantity rules hold for *every* numeric input a caller might pass—including `NaN`, `±Infinity`, `0`, and `-0`—ensuring that `set` always leaves a line within the valid range and that no written line is silently dropped on a subsequent read.

## Key elements

- **`RUN`** – Frozen fast-check config (`seed: 20_261_004`, `numRuns: 300`, `endOnFailure: true`) shared by all properties in this file; the fixed seed makes failures reproducible.
- **`anyNumber()`** – Generator that mixes `fc.double()` with explicit `fc.constantFrom(NaN, Infinity, -Infinity, 0, -0)` so the special values appear frequently enough to be exercised.
- **`afterEach` hook** – Clears `localStorage` between tests to isolate the storage layer.
- **`set` keeps the line in range** – Asserts `setGuestLineQuantity` returns a quantity within `[1, MAX_GUEST_LINE_QUANTITY]` for any generated number.
- **`set` survives a write-then-read cycle** – Asserts that after `writeGuestCart`, `readGuestCart` still returns exactly one line (i.e., the line was not corrupted into something the storage layer would filter out).
- **`add` never creates an unreadable line** – Asserts that `addGuestLine` with any number produces either no line or a line that round-trips through `writeGuestCart`/`readGuestCart` unchanged.

## Relationships

- **`../domain` (via `src/modules/cart/domain/index.ts`)** – Imports `MAX_GUEST_LINE_QUANTITY`, `addGuestLine`, `setGuestLineQuantity`; these are the functions under test.
- **`../composables/guest-cart-storage.ts`** – Imports `readGuestCart` and `writeGuestCart`; used to verify that whatever the domain functions produce is persistable and retrievable from `localStorage`.

## Notes

- The fixed seed (`20_261_004`) means the exact sequence of "bad" numbers is deterministic; changing it changes which edge cases are hit first.
- The default `fc.double()` generator rarely produces `NaN`/`±Infinity`, which is why the explicit `fc.constantFrom` overlay exists—without it the special values could go untested in 300 runs.
- Tests exercise the domain + storage boundary together (write-then-read round-trip), not the domain functions in isolation.
