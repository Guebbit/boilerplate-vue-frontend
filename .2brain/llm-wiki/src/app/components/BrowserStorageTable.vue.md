---
source: src/app/components/BrowserStorageTable.vue
sha256: 5ea40149b6216bd6b070690564f69c086d0b2728b16cdae1de84391a33044c5c
signature: 6211c8787a1c06b4884dfb439a6553bde5748391ed457ac7f76c2ececc2364cf
generated_at: 2026-11-10T02:51:54.345116+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/BrowserStorageTable.vue

## Purpose

Renders the "Cookies and storage" table (`#cookies`) on the privacy page. It dynamically lists every cookie/storage key the current deployment actually sets, pulling the item list from infrastructure code and resolving display text through i18n. The component adapts its rows to the shop's configuration (analytics, Faro, Turnstile) so operators see only what applies.

## Key elements

- **`export default { name: 'BrowserStorageTable' }`** — Named component block in the non-setup `<script>`; required for `<KeepAlive>` / devtools since `<script setup>` cannot declare a name.
- **`items: BrowserStorageItem[]`** — Populated via `browserStorageFor({ analytics, faro })`; items tied to analytics or Faro are omitted when neither is configured, so the table never lists a cookie the shop cannot set.
- **`usesTurnstile`** — `ref(false)`; set in `onMounted` after `fetchAntibotConfig()` resolves, based on whether `envelope.provider` is `'turnstile'`. Controls the conditional Cloudflare attribution paragraph below the table.
- **`session`** — Instance of the session Pinia store; `loadSessionMode()` is called on mount to populate `session.lifetimes`, which feeds the lifetime cell for the `session` and `rememberMe` rows.
- **`rowKey(item, cell)`** — Builds the i18n key (`browser-storage.rows.{id}.{purpose|lifetime}`) for per-row text.
- **`lifetimeOf(item)`** — Returns the lifetime cell text. For `session`/`rememberMe` rows it derives days (and optional staff hours) from `session.lifetimes`; returns `'—'` until the config has loaded. Other rows use a plain translation key.
- **Template** — A `<section id="cookies">` containing a `<v-table>` with seven columns (name, kind, setter, party, purpose, lifetime, necessity). Rows are generated from `items`. A special suffix is appended to the `checkoutDraft` name. The Turnstile note paragraph is shown only when `usesTurnstile` is set.

## Notes

- **No floating-promise suppression is needed** on `fetchAntibotConfig` because it has an explicit `.catch`; the only eslint-disable comment covers `session.loadSessionMode()`, which is documented as never rejecting (failed reads are dropped and retried internally).
- **Lifetime cells for `session` and `rememberMe` are async**: they render a dash (`—`) until `loadSessionMode()` resolves. This is intentional—no fallback number is fabricated.
- **The `checkoutDraft` row** gets an extra i18n suffix span next to its name, presumably because the actual storage key is namespaced per-shop and the suffix clarifies that.
- **All human-readable text is i18n-keyed**; there is no hardcoded English in the template (except the `'—'` placeholder). Admins can override every cell at runtime.
