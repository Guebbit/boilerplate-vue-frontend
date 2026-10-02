---
source: src/modules/api-keys/views/ApiKeysList.vue
sha256: 92398b59fdd79a337b1d8b27d087a7ce41be64f43507d5eac1efdb88e0dc21ac
generated_at: 2026-10-02T14:56:20.148371+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/views/ApiKeysList.vue

## Purpose

List view for machine-to-machine API credentials. Because `ListApiKeysParams` accepts only `page`/`pageSize`, the page has no filter form — just a paginated `DataTable`, a "Create" link, and a per-row revoke action.

## Key elements

- **`tableHeaders`** (computed) — localised column definitions (`name`, `publicPrefix`, `permissions`, `status`, `lastUsedAt`, `createdAt`, `expiresAt`, `revokedAt`, `actions`); re-evaluated on locale change.
- **`statusOf(apiKey)`** — derives `'revoked' | 'expired' | 'active'` from `revokedAt` / `expiresAt`; priority: revoked > expired > active.
- **`statusColor`** — maps the three status values to Vuetify tones (`success` / `warning` / `error`) for the status chip.
- **`handleRevoke(apiKey)`** — opens a confirmation dialog, then calls `revokeCredential` from the api-keys store; success toasts, failure routes to the row-action error slot.
- **`useBlockingError()`** — provides `rowActionError` / `reportRowActionError` / `clearRowActionError`; the message is rendered by an `InlineErrorAlert` above the table (the confirm dialog is already closed by the time the request resolves).
- **`watchApiKeysSearch({ onError })`** — triggers the store fetch; search-level failures toast via `notifyErrorMessages` (a separate, ambient path from row-action errors).
- **`useTouchFriendlySize()`** — returns `small` on desktop, Vuetify's default size below the `sm` breakpoint for WCAG-compliant tap targets on the revoke button.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor but not directly imported in this file's visible code; any use is transitive (likely through the store or a shared composable).

## Notes

- **Two error channels, deliberately distinct.** Search failures (ambient, table simply hasn't refreshed) toast via `notifyErrorMessages`. Revoke failures (a specific user action) surface as an `InlineErrorAlert` above the table because the confirm dialog has already dismissed. See `docs/theory/request-flow.md` for the rationale.
- **Revoked rows are not removed.** They stay in the list with dimmed text (`opacity-60`) and a disabled revoke button, so users can still see the public prefix and metadata.
- **Permission gating is client-side.** `session.can('create', 'ApiKey')` hides the Create button; `session.can('delete', 'ApiKey')` hides the Revoke button. A reader who cannot revoke should never see a button that would 403.
- **The `actions` column header reads no row field** (`synthetic: true`); the cell is entirely the scoped slot rendered per item.
