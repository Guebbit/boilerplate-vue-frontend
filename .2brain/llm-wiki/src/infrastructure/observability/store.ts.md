---
source: src/infrastructure/observability/store.ts
sha256: 0c8157d9938f2549c25122368d6fe2902a3962c197f2fa27e73e9e289c555252
generated_at: 2026-10-02T14:40:34.375651+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/observability/store.ts

## Purpose

Pinia store that wraps two independently-lazy telemetry SDKs—Grafana Faro (errors, tracing, web-vitals) and Umami (pageview analytics)—behind a single store API. It centralises SDK initialisation, consent gating, and sensitive-URL redaction so any component, store, or router hook can call into observability without importing the SDKs directly.

## Key elements

- **`useObservabilityStore`** — The exported Pinia store (`defineStore('observability', …)`). Exposes `faroReady`, `umamiReady`, `initFaro()`, `initUmami()`, `captureException()`, `setUmamiConsent()`, and `setUmamiOptOut()`.
- **`stripSensitiveUrlParts(url)`** — Exports a helper that removes query-string and fragment from a URL; returns the input unchanged if `new URL()` throws (relative/malformed input).
- **`stripTokensFromTelemetry(item)`** — Exports a Faro `beforeSend` hook that redacts `?token=` params from `meta.page.url` and from OTel span attributes (`url.full` / `http.url`). Never drops an item.
- **`ApiRejectEnvelope`** / **`asApiRejectEnvelope`** — Internal type-guard that narrows a caught value to the shape `http/interceptors.ts` rejects with (`success: false`, `status: number`, optional `errors`, `method`, `path`, etc.).
- **`describeApiRejectError`** — Builds a human-readable, groupable error name (e.g. `HTTP 401 UNAUTHORIZED GET /account`) for Faro's error list.
- **`setUmamiOptOut(disabled)`** — Toggles the `umami.disabled` key in `localStorage` so the Umami tracker script self-silences; swallows `SecurityError` from blocked storage.
- **`UmamiTracker`** — Minimal declared interface for `window.umami.identify`; the app only calls `identify`, never `track`.
- **`faroInitPromise`** — Module-level `Promise<boolean>` cached via `??=` so concurrent `initFaro()` calls share one initialisation; a cached rejection is cleared so a later call can retry.

## Relationships

*(No graph neighbours listed.)*

The store imports from `@/infrastructure/observability/config.ts` (`readFaroConfig`, `readUmamiConfig`, `readUmamiRequireConsent`, `originToRegExp`) and `@/infrastructure/utils/logger.ts` (`logger`). It is consumed by `src/infrastructure/http/interceptors.ts` (which calls `captureException`) and by app-bootstrap code that calls `initFaro()` / `initUmami()`.

## Notes

- **No `track()` / `trackEvent()` exists.** All server-side events are emitted by backend handlers; the frontend only sends pageviews (handled by the Umami script tag itself, including SPA route changes).
- **Umami is consent-gated.** The script tag is injected only after `setUmamiConsent(true)`, unless `VITE_UMAMI_REQUIRE_CONSENT=false` in the build.
- **Faro is a per-page singleton.** The `faro` handle is a plain `let` (non-reactive) inside the store setup closure; it is not exposed as state.
- **`faroInitPromise` rejection handling.** The `.catch` resets the promise to `undefined` so a transient CDN failure doesn't permanently block re-initialisation within the same session.
- **`stripSensitiveUrlParts` deliberately avoids `URL.canParse`.** The `try/catch` around `new URL()` is the only way to handle already-relative or malformed URLs without a throwing call (hence the eslint-disable).
- **Token redaction is the only PII scrub.** One-time email tokens (`?token=…`) are the sole sensitive param; no other query params are stripped.
- **`ignoreUrls`** in Faro config suppresses both spans and request events for matched URLs—see `FaroConfig.ignoreUrls` in the config module.
