---
source: src/modules/api-keys/views/ApiKeysList.vue
sha256: bf473ca18de77afbba3f0b8d2635497ef1ad0079424741159902a29ca92b1bd1
generated_at: 2026-10-17T00:33:17.397130+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/views/ApiKeysList.vue

## Purpose

Renders the paginated list of machine-to-machine API credentials. Because `ListApiKeysParams` accepts only `page`/`pageSize` (no filter fields), the page is a plain `DataTable` + pagination with a per-row revoke button. Key status (Active / Revoked / Expired) is derived client-side rather than stored, and revoked rows remain visible in the list.

## Key elements

- **Named component block (`<script>`)** — declares `name: 'ApiKeysListPage'` for devtools / `<KeepAlive>`; required because `<script setup>` cannot set `name` itself.
- **`tableHeaders` (computed)** — builds the localized `CoreDataTableHeader<ApiKey>[]` for the `DataTable`; re-evaluates on locale change. Includes two synthetic columns (`status`, `actions`) that read no row field directly.
- **`statusOf(apiKey)`** — derives `'revoked' | 'expired' | 'active'` from `revokedAt` → `expiresAt` → fallback; `revokedAt` set always wins.
- **`statusColor`** — maps each status to a Vuetify chip colour (`success` / `warning` / `error`).
- **`handleRevoke(apiKey)`** — opens a `useDialogStore().confirm(...)` dialog; on accept calls `revokeCredential(id)`, toasts success via `addMessage`, or reports failure into the `useBlockingError` ref (rendered as an `InlineErrorAlert` above the table).
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** — from `useBlockingError`; hosts the revoke-specific error separately from ambient search-failure toasts.
- **`rowActionSize`** — from `useTouchFriendlySize`; returns `'small'` on desktop, Vuetify's default below `sm` to meet WCAG touch-target guidance.
- **`watchApiKeysSearch({ onError })`** — kicks off the initial / reactive fetch bound to the store's pagination state; search failures toast via `notifyErrorMessages`.

## Relationships

- **`src/modules/api-keys/store.ts`** — primary data source. The component pulls `pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading` via `storeToRefs`, and calls the store actions `watchApiKeysSearch` and `revokeCredential`.
- **`src/infrastructure/utils/logger.ts`** — transitive dependency (reached indirectly through `errors.ts` / `use-blocking-error.ts`); no direct import in this file.

## Notes

- The component intentionally keeps two separate error channels: **search failures** toast globally (`notifyErrorMessages`) because the table simply hasn't refreshed, while **revoke failures** block the list in place via `InlineErrorAlert` (`rowActionError`). See `docs/theory/request-flow.md` for the rationale.
- The revoke button is disabled when `loading` is true **or** the row's derived status is already `'revoked'`, and is hidden entirely unless `session.can('delete', 'ApiKey')` passes.
- The "Create" button is gated on `session.can('create', 'ApiKey')` and navigates via `routerLinkI18n` to the `ApiKeyCreate` route.
- All date cells use `formatDate` / `formatDateTime` from `@/infrastructure/utils/formatters.ts`; absent values render as `EMPTY_VALUE`.
