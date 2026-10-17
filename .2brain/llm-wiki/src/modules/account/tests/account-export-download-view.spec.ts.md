---
source: src/modules/account/tests/account-export-download-view.spec.ts
sha256: a1171f20023f807e1e55428c978c9b545d2756d0ec4460e0816915b1fe51beee
generated_at: 2026-10-17T00:20:02.011133+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/account-export-download-view.spec.ts

## Purpose

Unit tests for the `AccountExportDownload` page — the landing target of a "your data export is ready" email link. Verifies that the page fetches nothing on arrival, downloads and saves the export as a dated JSON file on button press, handles missing/errored exports with the correct copy, and guards against double-clicks.

## Key elements

- **`vi.mock('@guebbit/js-toolkit')`** — replaces `downloadBlob` with a `vi.fn()` so jsdom's inability to save via a throwaway `<a>` is irrelevant; tests assert on the arguments passed instead.
- **`router`** — a real `createRouter` with `createMemoryHistory` and the production route table (`collectModuleRoutes(enabledModules)`), so the page reads its export id off the actual route param.
- **`mountPage()`** — helper that spies on `useProfileStore().downloadAccountExport` *before* mounting (the view destructures the action at setup) and mounts `AccountExportDownload` with router, vuetify, and i18n plugins. Returns `{ wrapper, download }`.
- **`DOCUMENT`** — minimal fixture `{ exportedAt, profile: { id } }` representing the API payload.
- **`beforeEach`** — resets Pinia, clears mocks, loads the `en` locale, and pushes `/en/account-export/e1` so the route param is populated.
- **Six test cases** covering: no network on arrival; successful save with correct filename (`account-export-2026-09-07.json`) and `data-test` markers; 404 error with "request a new one" hint; 500 error *without* that hint; empty response (no save, no error, no success); button disabled during in-flight and re-enabled after resolution.

## Relationships

- **`src/modules/account/views/AccountExportDownload.vue`** — the component under test; mounted directly with the real router so its route-param reading is exercised.
- **`src/modules/account/stores/profile.ts`** — provides `useProfileStore`; its `downloadAccountExport` action is the spied API boundary.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` registers module metadata so `collectModuleRoutes` can build the production route table in the test router.

## Notes

- The spy must be created *before* `mount()` because `AccountExportDownload` calls `useProfileStore()` during `<script setup>` and captures the action reference at that moment.
- The 404-vs-500 test is deliberate: the "kept for a few days / request a new one" hint must appear **only** for 404, not for generic server errors.
- `downloadBlob` is the single I/O boundary for the file save; all assertions about "what was saved" go through that mock rather than DOM file-download events.
