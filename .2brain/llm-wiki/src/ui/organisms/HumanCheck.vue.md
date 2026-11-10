---
source: src/ui/organisms/HumanCheck.vue
sha256: 3cce1c67660dc75bf99a66cf158ec124f4e5a14223f85c46b5497fa86ad68543
signature: da3f681858409315ee7204401b5d3737e6a6e8e786c70a317c2daf4c5afe658c
generated_at: 2026-11-10T06:31:51.115736+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/HumanCheck.vue

## Purpose

Provider-neutral human-challenge widget (CAPTCHA alternative). On mount it fetches the active antibot provider from `GET /config` and renders the corresponding vendor UI (ALTCHA web component or Cloudflare Turnstile iframe), or nothing for `none`. Hosting forms read the solved token via a template ref and attach it to their own submit; this component never calls the protected route itself.

## Key elements

- **`provider` (ref)** — Active provider name (`'none' | 'altcha' | 'turnstile'`); `undefined` until the config fetch resolves. Drives the `v-if`/`v-else-if` branches in the template.
- **`token` (ref, exposed)** — The solved challenge token; `undefined` until the visitor passes. Exposed via `defineExpose` for parent forms to read through a template ref.
- **`emit('solved', token)`** — Fired the moment either vendor hands back a usable token, letting a hosting form enable its submit button without polling.
- **`loadVendorScript(src)`** — Injects a `<script>` tag exactly once per `src` (deduped via `data-antibot-vendor`); resolves after the script runs.
- **`configureAltcha()`** — Fetches a fresh ALTCHA challenge envelope and calls the widget's `.configure({ challenge })` (documented programmatic path).
- **`renderTurnstile(siteKey)`** — Calls `turnstile.render(container, { sitekey, callback })` and stores the widget id for cleanup.
- **`turnstileGlobal()`** — Reads `globalThis.turnstile` through a narrowing cast (avoids a `declare global` that vue-tsc rejects inside `<script setup>`).
- **`mountProvider(provider, parameters)`** — Dispatches to `configureAltcha` or `loadVendorScript → renderTurnstile` after `nextTick`.
- **`onBeforeUnmount`** — Removes the Turnstile widget by id to prevent leaked iframes.

## Relationships

- **`src/modules/account/tests/use-password-breach-check.spec.ts`** — Appears in the dependency graph for this component, indicating the password-breach-check flow (or its test harness) renders or exercises `HumanCheck` as a verification step in that account flow.

## Notes

- **`nextTick` is mandatory, not defensive.** Setting `provider` only *schedules* the `v-if` branch DOM update; the template refs (`altchaElement`, `turnstileElement`) are still `undefined` in the microtask immediately after the assignment. Skipping the `nextTick` yields a null-ref error on first mount.
- **Script dedup relies on a `data-antibot-vendor` attribute** on the injected `<script>` tag. A second `HumanCheck` instance on the same page (e.g. after a route change) reuses the first load instead of double-injecting.
- **Turnstile has no npm wrapper.** The component talks to the global `turnstile` object directly; the `TurnstileGlobal` interface is a minimal structural cast, not an ambient declaration (which vue-tsc forbids inside function-scoped `<script setup>`).
- **Error path is silent by design.** If the config API is unreachable or a vendor script fails to load, the widget simply does not render. The health banner and the form's own submit error are expected to surface the problem; an unhandled rejection here would be a page-level bug.
- **The component never submits the protected form.** Token consumption is the hosting form's responsibility (via `withAntibotToken` or equivalent).
