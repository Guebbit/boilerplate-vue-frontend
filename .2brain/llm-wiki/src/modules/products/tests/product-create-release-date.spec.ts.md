---
source: src/modules/products/tests/product-create-release-date.spec.ts
sha256: 843f78a84dfabacace0ff58b8746177c70979123f67ae57b01abf7040d6f3b04
signature: 1c8d68c271ee67fb9959f1141d792cf7726a6a65e11a5c1036f83db26ffd7f12
generated_at: 2026-11-10T05:25:47.341485+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-create-release-date.spec.ts

## Purpose

Unit test for the `ProductCreate` form's release-date field. It verifies two contract behaviors on submit: an entered date is sent as the bare `YYYY-MM-DD` string (no time, no zone), and an empty field results in the `releaseDate` key being absent from the POST body entirely (the create contract accepts no `null`).

## Key elements

- **`lastPost()`** — Scans the mocked `orvalMutator` call history with `findLast` for the last call whose config has `method === 'POST'`; throws if none. Returns the call's config object (including `data`).
- **`mountCreate()`** — Mounts `ProductCreate` with the shared memory-history `router`, `vuetify`, and `i18n` plugins.
- **`submitCreate(releaseDate?)`** — Drives the form end-to-end: sets title, optionally sets the release-date input, triggers `form` submit, flushes promises, and returns the captured POST `data`.
- **`beforeEach`** — Resets and re-implements the `orvalMutator` mock (responding to `GET /locales` and `POST /products` via `parseOrvalFixture`), activates a fresh Pinia, and navigates the router to `/en/products/new`.
- **`describe` / `it` blocks** — Two assertions: entered date round-trips as a plain string; empty field yields `undefined` for `releaseDate`.

## Relationships

- **`src/modules/products/views/ProductCreate.vue`** — The component under test; this file mounts it and interacts with its DOM.
- **`src/infrastructure/http/index.ts`** — This file imports `orvalMutator` from it. The test intercepts that import so no real HTTP occurs, then inspects the recorded call arguments to assert on the POST body.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register enabled module routes before the router is built.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` is used inside the mock implementation to shape `GET /locales` and `POST /products` responses through the generated schema validator.

## Notes

- The file deliberately avoids sending `null` for an empty release date; the assertion is `toBeUndefined()`, reflecting that the create contract has no `null` option for that field.
- `lastPost` uses `findLast` rather than `find` because earlier calls (e.g. `GET /locales`) also pass through `orvalMutator`; the test needs the *last* POST specifically.
- Triple `flushPromises()` is used after mount and after submit to let Pinia state, router guards, and Vuetify render cycles settle—reducing flakiness without waiting on real timers.
