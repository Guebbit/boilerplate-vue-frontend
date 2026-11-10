---
source: src/modules/account/views/AccountExportDownload.vue
sha256: 200e33d7d262c468a159cc576122d93788588af7cc24e56080cf2e330a5d88e1
signature: 200e33d7d262c468a159cc576122d93788588af7cc24e56080cf2e330a5d88e1
generated_at: 2026-11-10T03:44:55.846647+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/AccountExportDownload.vue

## Purpose

Landing page for the "your data export is ready" email link. It requires an authenticated (step-up) session, reads the export's current status, and—only when the status is `ready`—lets the user trigger a download. The button-based flow (rather than an auto-download on mount) is deliberate so that mail-client prefetching does not silently fetch the file.

## Key elements

- **`handleDownload`** – Calls `downloadAccountExport()` from the profile store, saves the blob via `saveDownload`, sets `saved`, and on failure distinguishes a 404 (`exportGone`) from other errors via `absentIs`.
- **`exportStatus` / `statusKnown`** – Reactive pair; `statusKnown` prevents the "no export" message from appearing before the initial fetch resolves.
- **`downloadError` / `reportDownloadError` / `clearDownloadError`** – Blocking-error state (from `useBlockingError`) that shows an inline alert next to the button when a download fails.
- **`onAmbientError`** – Toast fallback for the initial status-fetch failure (no form context for an inline error).
- **Template branches** – Renders one of four intro messages (`ready`, `building`, `failed`, `none`) and a disabled/loading download button, a success alert, and an inline error alert.

## Relationships

- **`src/modules/account/stores/profile.ts`** – Provides `fetchAccountExport` (read status on mount) and `downloadAccountExport` (fetch the file on button click). All export data flows through this store.
- **`src/modules/account/tests/account-export-download-view.spec.ts`** – Unit/E2E spec that exercises this component's status rendering, download flow, and error states.

## Notes

- **Dual `<script>` blocks**: The non-`setup` block exists solely to set `name: 'AccountExportDownloadPage'` (needed by `<KeepAlive>` / devtools; `<script setup>` cannot declare it).
- **Auth dependency**: The route is `auth` and the download endpoint demands a *fresh* session (step-up interceptor handles re-auth transparently). A forwarded email link therefore hands nothing to an unauthenticated visitor.
- **404 vs. other errors**: Only a 404 sets `exportGone`, which unlocks the "kept for a few days" hint. Other failures show a generic inline alert without that hint.
- **No-body success**: If `downloadAccountExport()` resolves to a falsy value, `saveDownload` is skipped and `saved` remains `false`—the UI neither claims success nor shows an error.
