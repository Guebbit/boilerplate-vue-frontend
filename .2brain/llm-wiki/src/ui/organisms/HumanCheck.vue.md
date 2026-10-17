---
source: src/ui/organisms/HumanCheck.vue
sha256: 52e1d7a51a148563d2f5800080748a8e7aa250ad8ef2d9d2f65fcaca3fb49996
generated_at: 2026-10-17T01:58:30.609485+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/HumanCheck.vue

## Purpose

Provider-neutral anti-bot challenge widget. On mount it fetches `GET /antibot/config`, then renders the currently active vendor (ALTCHA web component or Cloudflare Turnstile iframe) or nothing if the provider is `none`. A hosting form reads the solved token via a template ref and attaches it to its own submit; this component never calls the protected route itself.

## Key elements

- **`defineExpose({ token })`** — the solved challenge token (or `undefined` until the visitor passes). Read by the hosting form as `humanCheckRef.value?.token`.
- **`emit('solved', token)`** — fires the instant either vendor returns a usable token, letting a hosting form react without polling.
- **`provider` (ref)** — the active vendor name from config; `undefined` while the config request is in flight.
- **`configureAltcha()`** — fetches a fresh challenge via `fetchAntibotChallenge()` and passes the unwrapped envelope data to `<altcha-widget>`'s `.configure()`.
- **`onAltchaVerified(event)`** — reads `event.detail.payload` from ALTCHA's `verified` custom event, stores it in `token`, and emits `solved`.
- **`renderTurnstile(siteKey)`** — calls `turnstile.render()` into the container div with the site key and a `callback` that stores the token and emits `solved`.
- **`loadVendorScript(src)`** — injects a vendor `<script>` once per `src` (deduplicated via `data-antibot-vendor` attribute) and resolves when it has loaded.
- **`turnstileGlobal()`** — narrows `globalThis.turnstile` into a local `TurnstileGlobal` interface; returns `undefined` before the script loads.
- **`onMounted`** — orchestrates: fetch config → set provider → `nextTick` → branch to ALTCHA or Turnstile setup. Catches all failures with a `logger.warn`.
- **`onBeforeUnmount`** — removes the Turnstile widget (if present) via `turnstile.remove(widgetId)`.

## Relationships

- **`@/infrastructure/http/antibot.ts`** — imports `fetchAntibotConfig` (provider + parameters) and `fetchAntibotChallenge` (fresh ALTCHA challenge object).
- **`@/infrastructure/utils/logger.ts`** — imports `logger` for the failure warning.
- **`altcha` (npm package)** — imported for its side-effect (custom-element registration) and the `AltchaWidgetElement` type.
- **Hosting form (consumer, not a static import)** — holds a template ref to this component, reads `.token`, and passes it to `withAntibotToken` on submit.

## Notes

- The component deliberately does **not** submit the token to any endpoint. The pairing with `withAntibotToken` / `x-antibot-challenge-token` lives in the hosting form.
- `nextTick()` after setting `provider` is load-bearing, not defensive: without it the `v-if` branch hasn't rendered, so `altchaElement`/`turnstileElement` are still `undefined`.
- ALTCHA's widget receives the challenge **object** (from `envelope.data`), not a URL, because the API envelope wraps the wire shape under `data`.
- Turnstile's global is accessed through a narrowing cast on `globalThis` rather than a `declare global` augmentation, because `<script setup>` is function-scoped after compilation and `vue-tsc` rejects ambient declarations there.
- `loadVendorScript` guards against double-injection: a second `HumanCheck` instance on the same page reuses the first `<script>` tag.
- If the config API is unreachable or the vendor script fails, the component logs a warning and renders nothing — it does not block the page or surface a separate error UI.
