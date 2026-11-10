---
source: tests/support/unit/async-answers.ts
sha256: 5ce144fbb367d58f56f52122a758c71a13613e5f9ab8b857f6d7fafb8e678a29
signature: 860fdbfbbe6eb92a1e9e2b507aee077d0a6f543e7a39aed7ba4a410baf6ec47f
generated_at: 2026-11-10T07:39:39.232664+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/async-answers.ts

## Purpose

Test-support helpers that let cart specs settle mocked API calls by hand. It provides typed access to a held promise and its settlers, plus the two rejection shapes the app's HTTP layer can produce, so tests can control answer order and failure mode explicitly.

## Key elements

- **`Answer<TCall>`** (type) — Resolves to the awaited return type of a call signature, so a held answer is typed by the function it answers.
- **`answered<TData>(data)`** (function) — Identity helper that wraps a payload in the "answer" vocabulary; returns the data unchanged.
- **`Gate<T>`** (interface) — Bundles a pending `Promise<T>` with its `resolve` and `reject` settlers.
- **`gate<T>()`** (function) — Creates a `Gate` via `Promise.withResolvers<T>()`; the primary entry point for holding back an answer.
- **`apiRejection(status, code)`** (function) — Builds the problem-details rejection (via `aProblem` from `./fixtures.ts`) that the HTTP layer throws for an answered HTTP failure. Never an `Error`.
- **`lostAnswer()`** (function) — Returns the rejection value for a call that never received an answer: `new Error('Network Error')`, with no `status` field.

## Relationships

- **All cart spec files** (`store.spec.ts`, `store-interleavings.spec.ts`, `store-late-answer.spec.ts`, `store-stale-answer.spec.ts`, `guest-cart-store.spec.ts`, `idempotent-calls.spec.ts`, `store-double-seed.spec.ts`, `store-add-key.spec.ts`, `store-checkout-key.spec.ts`, `store-stock-poll.spec.ts`, `cart-view-double-submit.spec.ts`, `cart-view-interleavings.spec.ts`, `cart-view-shipping-radio.spec.ts`, `cart-view-stale-refusal.spec.ts`, `cart-interleave.ts`) — import `gate`, `answered`, `apiRejection`, and/or `lostAnswer` to construct and settle mocked API responses in a controlled sequence.

## Notes

- `gate` uses `Promise.withResolvers`, a relatively new API (ES2024 / TS 5.5+). Callers do not need to manage a resolver pair manually.
- The two rejection shapes are intentionally distinct: `apiRejection` carries an HTTP `status` and a structured `errors` array; `lostAnswer` is a plain `Error` with no `status`. Tests assert on this difference to distinguish "server said no" from "server never answered."
- `answered` is a pure identity function — it adds no runtime behavior, only the semantic label "the answer" in test code.
