---
source: src/modules/account/components/ProfileConnectedAccounts.vue
sha256: 70071906a1787340abfe182cfa9cbbeb11dc9b7a1e6cc0060f89da1526a235e4
signature: 70071906a1787340abfe182cfa9cbbeb11dc9b7a1e6cc0060f89da1526a235e4
generated_at: 2026-11-10T03:20:36.285554+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileConnectedAccounts.vue

## Purpose

Renders the "Connected accounts" panel on the profile page: lists OAuth sign-in providers (e.g. Google, GitHub) already linked to the current user, allows removing them behind a confirmation dialog, and offers buttons to connect providers that the deployment supports but the user hasn't linked yet. It delegates all server-side auth (linking, unlinking, step-up challenges) to stores and the global interceptor, keeping this component UI-only.

## Key elements

- **`handleRemove(provider)`** – Wraps `unlinkProvider` in a `useDialogStore().confirm()` prompt; toasts on success, surfaces failure via `useBlockingError`. Wrapped in `singleFlight` to suppress duplicate clicks.
- **`handleConnect(provider)`** – Calls `startProviderLink` (from the oauth-links store) with `continueTo` = current pathname and `locale`, then redirects the browser to the returned `authorizeUrl`. Sets per-button `connecting` loading state.
- **`connectable`** (computed) – Filters `offeredProviders` to those not yet present in `links`, driving the "Connect …" button row.
- **`removing` / `connecting`** (refs) – Track which single row/button is in-flight so only that one shows a spinner.
- **`useBlockingError`** – Local error state rendered as an `InlineErrorAlert` above the list; cleared on each new action attempt.
- **`onMounted`** – Kicks off `fetchProviders()` (non-blocking, falls back to cached) and `fetchLinks()`.

## Relationships

- **`src/modules/account/stores/oauth-links.ts`** – Provides `useAccountOAuthLinksStore` (exposes `links`, `fetchLinks`, `unlinkProvider`) and the `startProviderLink` action that builds the OAuth consent URL.
- **`src/modules/account/stores/oauth-providers.ts`** – Provides `useAccountOAuthProvidersStore` (exposes `providers`, `fetchProviders`) and the `providerLabel` display helper.
- **`src/modules/account/views/Profile.vue`** – Parent view that embeds this panel in the account settings layout.
- **`src/modules/account/tests/profile-connected-accounts.spec.ts`** – Unit/E2E tests targeting the `data-test` hooks on this component (`connected-list`, `connected-remove`, `connected-connect-*`, etc.).

## Notes

- A separate `<script>` block declares `name: 'ProfileConnectedAccounts'` because `<script setup>` cannot set a component name; needed for `<KeepAlive>` and devtools.
- No "last provider" guard exists in the UI. The backend may reject removal of the last linked provider; the step-up/interceptor chain handles auth re-challenges transparently.
- `handleRemove` is wrapped in `singleFlight`, but `handleConnect` is not (it redirects away, so a double-fire is naturally idempotent after the first navigation).
- `formatDateTime` and `providerLabel` are display-only utilities; they do not mutate store state.
- The `src/infrastructure/utils/logger.ts` file appears in the dependency graph but is **not** imported directly here; logging, if any, is handled inside the stores or interceptor layer.
