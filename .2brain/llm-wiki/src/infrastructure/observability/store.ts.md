---
source: src/infrastructure/observability/store.ts
sha256: a268df6af2fb4f5f062988e996abc9ccd776f8e3f9834c92a2ce2797d6f69ad8
signature: 0b41021e8dd995b44b3bd492d00f55db222d1db7109cdfc88eeea07dd7541ff9
generated_at: 2026-11-10T03:08:35.548717+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/observability/store.ts

## Purpose

Pinia store that wraps two lazily-initialized telemetry SDKs—Grafana Faro (errors, tracing, web-vitals) and Umami (product analytics)—behind a single consent-gated API. It exists so that neither SDK loads, no identifying data is transmitted, and no measurements occur until the visitor explicitly consents, satisfying ePrivacy Art. 5(3) and GDPR data-minimisation (Art. 5(1)(c), 25(2)).

## Key elements

- **`useObservabilityStore`** — The Pinia store. Exposes consent-gated initialisation, pause/resume (Faro), and load/unload (Umami). State includes `faroReady` and `umamiReady` refs; the Faro instance is a module-scoped non-reactive handle.
- **`stripSensitiveUrlParts(url)`** (exported) — Strips the query string and fragment from a URL. Tolerates relative or malformed input by returning it unchanged rather than throwing.
- **`stripTokensFromTelemetry(item)`** (exported) — Faro `beforeSend` hook that redacts one-time email tokens (carried as `#token=` fragments) from page URLs, OTLP span attributes (`url.full`, `http.url`), and event attributes (`fromUrl`, `toUrl`, performance `name`). Never drops an item.
- **`spanAttributes` / `stripSpanUrlAttribute` / `stripEventUrls`** (internal) — Walk an OTLP payload or event payload and apply URL redaction in place.
- **`asApiRejectEnvelope` / `describeApiRejectError`** (internal) — Narrow an unknown thrown value to the app's RFC 9457 problem-details shape and produce a stable, groupable error name (e.g. `HTTP 401 UNAUTHORIZED GET /account`) for Faro's error list.
- **`setUmamiOptOut`** (internal) — Writes or removes the `localStorage` key Umami's tracker checks before every send.
- **`faroInitPromise`** (internal) — Deduplicates concurrent `initFaro()` calls into a single boot.

## Relationships

- **`scripts/lighthouse/evaluate.ts`** — Listed as a dependency-graph neighbor. The Lighthouse evaluation script interacts with this module (likely importing the store or its URL-stripping utilities) so that telemetry does not fire during automated performance audits.

## Notes

- Both SDKs are dynamically imported (`import()`), keeping them out of the critical entry bundle.
- Session tracking is explicitly disabled for Faro—no session id is generated or stored.
- Consent changes mid-init are handled: the `faroConsent` flag is remembered and applied the moment the SDK finishes loading (a late withdrawal pauses the transport immediately).
- `stripSensitiveUrlParts` uses `try/catch` around `new URL()` because `URL.canParse` is not universally available and relative/malformed URLs are expected input (e.g. a relative SPA route).
- The `beforeSend` hook is additive (redacts in place); it never removes a telemetry item.
- Umami records `PAGEVIEWS` itself, including SPA route changes. The only custom browser events are browsing events relayed through the backend; all business facts are reported server-side.
- Neither SDK is ever told who the visitor is: `setUser` and `identify` are never called.
