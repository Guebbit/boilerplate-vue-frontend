---
source: src/modules/account/components/ProfileConnectedAccounts.vue
sha256: e2780c2005dddafd770f3c90449d91262a88780b253bdb3c4a79913734413ec8
generated_at: 2026-10-17T00:15:49.879274+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileConnectedAccounts.vue

## Purpose
Renders the "Connected accounts" card on the profile page, listing the OAuth sign-in providers (Google, GitHub) currently linked to the visitor's account. Each row shows the provider name, connection date, and a remove button gated behind a confirmation dialog.

## Key elements
- **`handleRemove(provider)`** — opens a `useDialogStore().confirm` prompt, then calls `unlinkProvider(provider)` from the OAuth-links store. On success, dispatches a toast; on failure, sets the local `actionError` (blocking error). Tracks per-row spinner via the `removing` ref.
- **`onMounted(fetchLinks)`** — loads the list of linked providers from the store on first render.
- **`removing: Ref<string | undefined>`** — holds the provider key currently being unlinked so only that row's button shows a loading state.
- **`useBlockingError()`** — local panel-level error slot displayed via `InlineErrorAlert` above the list; the list itself stays interactive after a failed removal.
- **`providerLabel(provider)`** — imported from `../stores/oauth.ts`; maps a registry key to a human-readable provider name.
- **`formatDateTime(link.connectedAt)`** — imported from `@/infrastructure/utils/formatters.ts`; renders the "connected since" subtitle.
- **Scoped style `.connected-since`** — overrides `--v-medium-emphasis-opacity` to `1` so the date meets WCAG contrast on the card surface.

## Relationships
- **`src/modules/account/stores/oauth-links.ts`** — primary data source; the component reads `links` (via `storeToRefs`) and calls `fetchLinks` / `unlinkProvider` from the same store instance.
- **`src/modules/account/stores/oauth.ts`** — provides the `providerLabel` helper used for display text and confirmation message interpolation.
- **`src/modules/account/views/Profile.vue`** — parent view that composes this card into the profile layout.
- **`src/modules/account/tests/profile-connected-accounts.spec.ts`** — unit/integration spec covering render, empty state, and the remove-flow interactions.

## Notes
- The component intentionally does **not** handle step-up authentication or "last method" validation. A stale session on removal is expected to be resolved by the shared interceptor's prompt, not by this panel.
- `removing` is a plain ref, not a reactive map, because only one removal can be in flight at a time (the confirm dialog serialises user actions).
- The contrast override in `<style scoped>` mirrors the same fix in `ProfileSessions.vue`; if Vuetify changes its emphasis tokens, both need updating.
- The file uses two `<script>` blocks: a plain `export default { name }` for devtools/KeepAlive, and `<script setup>` for all logic — a pattern required by Vue 3.
