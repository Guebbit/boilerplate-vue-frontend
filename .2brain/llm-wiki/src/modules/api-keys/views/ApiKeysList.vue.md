---
source: src/modules/api-keys/views/ApiKeysList.vue
sha256: c04cf9f1907c4f4939d381bb72491d4a32c50a46191382c011ad61d5c7137b82
signature: c04cf9f1907c4f4939d381bb72491d4a32c50a46191382c011ad61d5c7137b82
generated_at: 2026-11-10T03:52:34.827809+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/views/ApiKeysList.vue

## Purpose

Paginated list view for machine-to-machine API keys. Renders a `DataTable` with per-row revoke action (behind a confirm dialog), page-size selector, and a create button gated by session permission. There is no filter form because `ListApiKeysParams` accepts only `page`/`pageSize`.

## Key elements

- **`ApiKeysListPage`** (named export) — stable component name for DevTools and `<KeepAlive>`; required because `<script setup>` cannot declare `name` itself.
- **`tableHeaders`** (computed) — localized column definitions for the `DataTable`; re-translates on locale change. Includes two synthetic columns (`status`, `actions`) that read no row field directly.
- **`statusColor`** — maps each `ApiKey['status']` to a Vuetify `ThemeColor` for the status chip.
- **`handleRevoke(apiKey)`** — confirm → `revokeCredential(id)` → success toast pipeline; failures land in `rowActionError` (displayed by `InlineErrorAlert` above the table).
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** (from `useBlockingError`) — blocking error state exclusive to the revoke write action; distinct from ambient search-failure toasts.
- **`useListUrlState`** — keeps `pageCurrent` and `pageSize` in the URL so a reload or shared link restores the same page window.
- **`rowActionSize`** (from `useTouchFriendlySize`) — `small` on desktop, larger default below `sm` breakpoint for WCAG touch targets.
- **`watchApiKeysSearch`** (from store) — triggers the API call; `onError` toasts via `notifyErrorMessages`.
- **Template slots** — custom renderers for `name` (muted when revoked), `publicPrefix` (mono font), `permissions` (chips), `status` (colored chip), date columns (formatted or `EMPTY_VALUE`), and `actions` (revoke button visible only when `item.actions.revoke` is present).

## Relationships

- **`src/modules/api-keys/store.ts`** — Source of all data and actions: `useApiKeysStore` provides `watchApiKeysSearch`, `revokeCredential`, and reactive refs (`pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading`, `filters`).
- **`src/modules/api-keys/tests/api-keys-list-url.spec.ts`** — Verifies the URL-state behavior of this component (page/pageSize persistence via `useListUrlState`).

## Notes

- **Status provenance is documented inconsistently.** The module docblock states status is "derived client-side from `revokedAt`/`expiresAt`," but the `statusColor` comment explicitly says "The server decides the status (a banned minter suspends their keys)," and the template reads `item.status` directly from the API response. The server-provided `status` field is authoritative.
- **`filters` is always empty** — it exists only to satisfy the `useListUrlState` signature; no user-facing filter controls are rendered.
- **Two distinct error channels.** Search failures toast ambiently (`notifyErrorMessages`); revoke failures block the list via `InlineErrorAlert`. They intentionally use different UX paths (see `docs/theory/request-flow.md`).
- **Create button** is gated by `session.can('create', 'ApiKey')` and links to the `ApiKeyCreate` route via `routerLinkI18n`.
