---
source: src/modules/account/components/ProfileExportData.vue
sha256: ecddba55f7a8ec489380813ad446b9d8147a013941308758342ebe5565e5678c
signature: ecddba55f7a8ec489380813ad446b9d8147a013941308758342ebe5565e5678c
generated_at: 2026-11-10T03:20:58.445479+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileExportData.vue

## Purpose

A self-service GDPR data-export card for the profile page. It exposes a single button that asks the server to build the visitor's data export, then polls the export status until it is ready, failed, or expired. The component never handles the data transfer itself — the server mails a download link separately.

## Key elements

- **`handleExport`** — Calls `requestAccountExport()` from the profile store; on success bumps the epoch counter and adopts the returned status; on failure surfaces an inline blocking error next to the button.
- **`refresh`** — Calls `fetchAccountExport()` once and adopts the result, guarding against stale responses via the `epoch` counter.
- **`adopt`** — Stores the latest `AccountExport` status; if the status is `building`, schedules the next poll with `setTimeout` (15 s interval, `POLL_MS`).
- **`epoch`** — Monotonically increasing guard so a slow in-flight poll cannot overwrite a newer response triggered by `handleExport`.
- **`exportStatus`** — Reactive ref holding the current `AccountExport | undefined`; drives the template's three conditional alerts (building / ready / failed).
- **`useBlockingError` / `useAmbientError`** — Inline (button-adjacent) error for the export request itself vs. toast for background poll failures, respectively.
- **`onMounted` / `onBeforeUnmount`** — Initial status read on mount; cleanup of the pending poll timer on unmount.

## Relationships

- **`src/modules/account/stores/profile.ts`** — Source of the `requestAccountExport` and `fetchAccountExport` actions consumed via `useAccountProfileStore`.
- **`src/modules/account/views/Profile.vue`** — Parent view that renders this card within the profile page layout.
- **`src/modules/account/tests/profile-export-data.spec.ts`** — Unit/integration spec covering this component's export-request, polling, and error-display behavior.
- **`src/infrastructure/utils/logger.ts`** — Transitive dependency reached through the `useBlockingError` / `useAmbientError` composables that report or log failures.

## Notes

- Two `<script>` blocks are required: the plain block sets `name: 'ProfileExportData'` (needed for `<KeepAlive>` matching and devtools), while all logic lives in `<script setup>`.
- The epoch guard means a poll that started *before* a user-triggered `handleExport` resolves will be silently dropped — this is intentional to prevent a stale "building" status from clobbering a newer "ready" or "failed" one.
- No confirmation dialog: the action is non-destructive (unlike the sibling `ProfileDeleteAccount`), and re-authentication is handled transparently by a step-up interceptor, so the component does not prompt for credentials.
- The `data-test` attributes on every state element are the contract the spec file asserts against; renaming them will break tests.
