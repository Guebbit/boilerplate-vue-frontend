---
source: src/modules/account/views/AccountExportDownload.vue
sha256: a19bee1d02851828ee1896056ced92b4ad918a77663192eee85e33d63565ec25
generated_at: 2026-10-17T00:29:08.188446+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/AccountExportDownload.vue

## Purpose

The landing page for the "your data export is ready" email link. It requires a signed-in session (the route is under the `auth` guard) and presents a single button that, when clicked, fetches the export and saves it as a local JSON file. The download is intentionally triggered by user action rather than on mount so that a mail-scanner prefetching the link does not trigger the API call.

## Key elements

- **`handleDownload()`** — Core action: calls `downloadAccountExport(exportId)` from the profile store, then saves the response via `downloadBlob` (js-toolkit) as `account-export-YYYY-MM-DD.json`. On success sets `saved`; on failure sets `exportGone` (if 404) and reports the error.
- **`exportId`** — Read once from `route.params.id`, type-guarded with `typeof … === 'string'` because Vue Router params can be `string | string[]`.
- **`saved` / `exportGone` / `downloading`** — Reactive refs driving the "saved" alert, the 404 hint, and the button's loading/disabled state.
- **`useBlockingError()`** — Local error-state hook that surfaces a download failure inline next to the button.
- **Named default export (`AccountExportDownloadPage`)** — Separate `<script>` block solely to give the SFC a stable `name` for devtools / `<KeepAlive>`, since `<script setup>` cannot declare one.

## Relationships

- **`src/modules/account/stores/profile.ts`** — Provides `useProfileStore()`, from which this page destructures `downloadAccountExport` (the API call that retrieves the export blob by id).
- **`src/modules/account/tests/account-export-download-view.spec.ts`** — Unit/component test for this view; exercises the download button, success/error/saved states, and the 404 hint.

## Notes

- The 404 response is intentionally ambiguous server-side: it covers "export expired", "still building", "failed", and "not this account's" alike. The UI only special-cases 404 to show the "kept for a few days" hint; all other errors are reported generically.
- A successful response with a falsy body (`!data`) skips the save step silently — no error, no "saved" alert.
- The filename date comes from `data.exportedAt.slice(0, 10)`, i.e. the day the export was assembled, not the day the user clicks download.
- `data-test` attributes are present on the button, saved-alert, and error-alert for E2E selectors.
