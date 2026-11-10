---
source: tests/unit/app/error-messages.spec.ts
sha256: b09ee7adc821da5bc2379a4f9951e21a1df220f82fac52a2108d0594afcb725b
signature: b09ee7adc821da5bc2379a4f9951e21a1df220f82fac52a2108d0594afcb725b
generated_at: 2026-11-10T07:44:50.032082+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/error-messages.spec.ts

## Purpose

Unit tests for the `isKnownErrorMessage` predicate (exported from `@/app/utils/error-messages`), which both `Error.vue` and the router's `onError` hook use to decide whether a string is a first-party i18n key or an arbitrary external error. Ensuring only known keys pass guarantees that raw messages (e.g. dynamic-import failures, network errors) never leak into the rendered page, the URL, or Umami pageview metadata.

## Key elements

- **`describe('isKnownErrorMessage')`** — the single test suite in the file.
- **`it.each([...])('%s -> %s', …)`** — table-driven cases covering three known keys (`error-page.not-found`, `error-page.unexpected`, `navigation.error-forbidden`) that must return `true`, and three non-keys (a Vite dynamic-import error, `'Network Error'`, empty string) that must return `false`.
- **`it('is not itself a match for the generic key's own namespace by accident')`** — sanity check that `GENERIC_ERROR_KEY` itself is recognized, since `Error.vue` translates it like any other known key.

## Relationships

- **`@/app/utils/error-messages`** — the module under test; provides `isKnownErrorMessage` and `GENERIC_ERROR_KEY`.

## Notes

- The file's doc comment makes the security/privacy motivation explicit: the predicate is the gate between app-owned i18n strings and verbatim third-party error text, so any regression here would surface in user-visible output and analytics.
- The second test is deliberately a *meta*-check (the generic key passing its own predicate) to catch a namespace-matching bug that the table-driven cases wouldn't cover.
