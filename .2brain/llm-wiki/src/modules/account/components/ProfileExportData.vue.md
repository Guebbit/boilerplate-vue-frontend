---
source: src/modules/account/components/ProfileExportData.vue
sha256: 4f8e10d8e642437e1d98a759270d7cb620f3b6fa25436d3d0e1aa6c09d156972
generated_at: 2026-10-17T00:16:10.960708+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileExportData.vue

## Purpose

A single-button GDPR self-service export trigger. Clicking it asks the API to build the visitor's data export in the background; the server then emails a download link. The component only confirms the request was accepted (or shows an inline error on failure). It is deliberately simpler than its `ProfileDeleteAccount` sibling: no confirm dialog, no re-auth UI (the step-up interceptor handles that transparently).

## Key elements

- **`name: 'ProfileExportData'`** — explicit component name (required because `<script setup>` cannot declare one; used by devtools and `<KeepAlive>`).
- **`useProfileStore().requestAccountExport()`** — the store action that fires the export request.
- **`requested` (`ref<boolean>`)** — flips to `true` on success to show the "link is on its way" alert.
- **`useBlockingError()`** — local blocked-state hook; exposes `message`, `report`, and `clear` for the inline error display next to the button (replaces a toast; see `docs/theory/request-flow.md`).
- **`handleExport()`** — click handler: clears prior error, resets `requested`, calls the store action, sets `requested = true` on resolve, or reports the error on reject.
- **Template** — `v-card` containing a `v-btn` (the trigger), a `v-alert` (success, shown when `requested`), and `InlineErrorAlert` (failure). All carry `data-test` attributes for the spec file.

## Relationships

- **`src/modules/account/stores/profile.ts`** — imported via `useProfileStore`; supplies the `requestAccountExport` action this component calls.
- **`src/modules/account/views/Profile.vue`** — parent view that renders this component within the account/profile page layout.
- **`src/modules/account/tests/profile-export-data.spec.ts`** — dedicated unit/integration spec; targets the `data-test` hooks (`profile-export-data`, `profile-export-data-requested`, `profile-export-data-error`).
- **`src/infrastructure/utils/logger.ts`** — not imported directly here; likely consumed transitively by `useBlockingError` or the profile store for error reporting.

## Notes

- No confirmation dialog by design: the action is non-destructive, so a `v-dialog` / confirm step is intentionally omitted.
- No re-auth logic lives in this component. The server rejects stale sessions; the global step-up interceptor intercepts and prompts the user. This component simply surfaces success or failure.
- Error display is **inline** (via `InlineErrorAlert`), not a toast. This is a project-wide convention for blocked actions — see `docs/theory/request-flow.md`.
- The actual exported data never reaches the client. The API assembles it server-side and emails a link to `views/AccountExportDownload.vue`.
