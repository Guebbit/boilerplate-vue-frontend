---
source: src/infrastructure/observability/store.ts
sha256: a24495c71b65a9c2f51cc010c19db23e684e891008a2185086b59cdbaf9e291e
generated_at: 2026-10-17T00:11:45.246743+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/observability/store.ts

## Purpose

A Pinia store that provides a single, lazily-initialized API over two independent telemetry SDKs—Grafana Faro (errors, tracing, web-vitals) and Umami (product analytics). It exists to eliminate init-order problems between the two SDKs and to make telemetry calls available from components, other stores, and the router alike. Consent-gating logic (Faro measurement instrumentations, Umami script loading, opt-out persistence) is centralized here so the rest of the app never touches either SDK directly.

## Key elements

- **`stripSensitiveUrlParts(url: string): string`** — Exports a helper that removes the query string and hash from a URL string. Falls back to a regex split when `new URL()` throws (relative or malformed input).
- **`stripTokensFromTelemetry(item: TransportItem): TransportItem`** — Exports a Faro `beforeSend` hook. Strips `#token=` fragments and query params from `meta.page.url` and from OTel span attributes (`url.full` / `http.url`) before any item leaves the browser. Never drops items.
- **`useObservabilityStore`** — The Pinia store (`'observability'`). Exposes `faroReady`, `umamiReady` state, and methods:
  - `initFaro()` — Dynamically imports Faro SDK + tracing, initialises with crash reports only (no session id). Idempotent via a shared promise; concurrent callers reuse one setup.
  - `setFaroConsent(granted: boolean)` — Attaches/detaches measurement instrumentations (Web Vitals, Performance, Navigation) on the live Faro instance.
  - `initUmami()` / `setUmamiConsent(granted: boolean)` — Injects or removes the Umami `<script>` tag; sets the `umami.disabled` localStorage key to silence the tracker.
  - `captureException(error: unknown)` — Normalises the app's `ApiRejectEnvelope` into a descriptive name (e.g. `HTTP 401 UNAUTHORIZED GET /account`) before forwarding to Faro.
- **`ApiRejectEnvelope`** — Narrowing interface for the standard API error shape (`success: false`, `status: number`, optional `errors`, `requestId`, `traceparent`, `method`, `path`).
- **`UmamiTracker`** — Minimal declared shape of `window.umami` (only `identify` is used).
- **`setUmamiOptOut(disabled: boolean)`** — Internal helper; writes/removes `umami.disabled` in `localStorage`, swallowing storage-block errors.
- **`asApiRejectEnvelope` / `describeApiRejectError`** — Internal narrowing and naming helpers for `captureException`.

## Relationships

No dependency-graph neighbors are recorded for this file. It imports `readFaroConfig`, `readUmamiConfig`, `readUmamiRequireConsent` from `@/infrastructure/observability/config.ts` and `logger` from `@/infrastructure/utils/logger.ts`. It is expected to be called by the app bootstrap, the router, and `analytics-consent.ts` (referenced in the module doc).

## Notes

- Both SDK packages (`@grafana/faro-web-sdk`, `@grafana/faro-web-tracing`, Umami script) are **dynamically imported / injected at runtime**—they are excluded from the critical entry bundle.
- Before consent, Faro runs with **no session id** and only crash-reporting instrumentations; measurement instrumentations are added/removed via `setFaroConsent`. A consent granted before `initFaro` resolves is remembered and applied on boot.
- `stripSensitiveUrlParts` intentionally tolerates unparseable URLs (returns the input unchanged) rather than throwing; this is a documented eslint-suppressed `try/catch` around `new URL`.
- The Umami script self-manages PAGEVIEWS and SPA route tracking; this app sends **no** custom Umami events. The only custom analytics path is `trackBrowsing` in `analytics-consent.ts` through the backend relay.
- `localStorage` access in `setUmamiOptOut` is wrapped in a try/catch because storage can be blocked (private browsing, user settings); a refusal is logged at debug level and ignored.
- The store uses a setup-style `defineStore` with module-scoped (`let`) variables for the Faro instance and in-flight promise—these are deliberately **not** reactive refs since they are used imperatively.
