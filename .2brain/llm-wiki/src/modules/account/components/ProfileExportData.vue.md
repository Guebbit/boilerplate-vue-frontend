---
source: src/modules/account/components/ProfileExportData.vue
sha256: 10446baa63a41d2694fc762694e2ffd0618241f3380500362a1ad2911d76d0a7
generated_at: 2026-10-02T12:11:17.567184+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileExportData.vue

## Purpose

Self-service GDPR data export widget: a single "Export my data" button that fetches the user's account data from the server and triggers a browser download of a pretty-printed JSON file. It is intentionally minimal — no confirmation dialog (the action is non-destructive), no in-UI rendering of the data, and no manual re-authentication handling (the step-up interceptor covers that transparently).

## Key elements

- **`handleExport`** — clears any prior inline error, calls `exportAccountData()`, then either downloads the result via `downloadBlob` (filename: `account-export-<YYYY-MM-DD>.json`) or routes the failure into the inline error state.
- **`useBlockingError`** instance — exposes `exportError` (message), `reportExportError` (setter), and `clearExportError` (reset) for the inline `InlineErrorAlert` next to the button.
- **`useProfileStore().exportAccountData`** — the store action responsible for the actual server round-trip.
- **Template** — a `v-card` wrapping a `v-btn` (trigger) and an `InlineErrorAlert` (failure display). Carries `data-test="profile-export-data"` / `data-test="profile-export-data-error"` hooks for E2E tests.

## Relationships

- **`src/infrastructure/utils/logger.ts`** (graph neighbor) — not imported directly here; reached indirectly through `useBlockingError` / the step-up interceptor that `reportExportError` and the auth challenge flow rely on for structured logging of failures.

## Notes

- No confirm dialog on purpose: exporting is non-destructive, unlike the sibling `ProfileDeleteAccount` component which does prompt.
- The download filename date comes from the **server-provided** `data.exportedAt` field (first 10 chars), not from `Date.now()` on the client.
- On failure the user sees an inline alert beside the button rather than a toast — see `docs/theory/request-flow.md` for the rationale.
- Re-authentication is handled entirely by the step-up interceptor; this component never touches credentials or session tokens.
