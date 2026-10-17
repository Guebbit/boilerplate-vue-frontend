---
source: tests/unit/app/error-messages.spec.ts
sha256: b09ee7adc821da5bc2379a4f9951e21a1df220f82fac52a2108d0594afcb725b
generated_at: 2026-10-17T02:30:01.857498+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/error-messages.spec.ts

## Purpose

Unit tests for the `isKnownErrorMessage` predicate (and its companion constant `GENERIC_ERROR_KEY`) exported from `@/app/utils/error-messages`. The predicate is the single gate that both `Error.vue` and the router's `onError` hook consult to decide whether a message is a known app-internal key (translatable) or an arbitrary external string (must not leak into the UI, URL, or Umami analytics). This spec locks down that classification.

## Key elements

- **`describe('isKnownErrorMessage')`** — top-level suite; the only suite in the file.
- **`it.each` (6 cases)** — parameterised table covering:
  - Known keys (`error-page.not-found`, `error-page.unexpected`, `navigation.error-forbidden`) → must return `true`.
  - Unknown strings (a dynamic-import failure URL, `"Network Error"`, empty string) → must return `false`.
- **`it('is not itself a match for the generic key's own namespace by accident')`** — sanity-checks that `GENERIC_ERROR_KEY` itself passes the predicate, confirming `Error.vue` can translate it like any other known key.

## Relationships

- **Imports** `GENERIC_ERROR_KEY` and `isKnownErrorMessage` from `@/app/utils/error-messages` (the module under test). No other runtime dependencies.
- No other graph neighbors.

## Notes

- The test file's header comment explicitly ties the predicate to three consumers (`Error.vue`, `router/index.ts` `onError`, Umami pageview). The spec here only exercises the predicate in isolation; the consumer-side behaviour is covered (or not) elsewhere.
- The "sanity check" test is intentionally a single-case guard against a future refactor that narrows the known-key set and accidentally excludes the generic fallback key.
