---
source: src/infrastructure/observability/config.ts
sha256: 497087be244403de7455ed18c88e4ac10fa9113c00ea297dbc9d857a96327451
signature: 83f1693182a24d0aa4a87e9f10d12b5c5f5cd04d60d73b4fc34c04d59e10f56f
generated_at: 2026-11-10T03:08:14.940615+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/observability/config.ts

## Purpose

Pure environment-variable readers for the two telemetry back-ends (Grafana Faro and Umami). Each reader returns `undefined` when its required variable is unset, which serves as the single opt-in gate: a build with neither set ships the code but never calls out.

## Key elements

- **`FaroConfig`** (interface) — shape passed to `initializeFaro()`: collector `url`, identity fields, `propagateTo` (cross-origin trace-header targets), and `ignoreUrls` (endpoints Faro must not instrument).
- **`UmamiConfig`** (interface) — tracker `src` and `websiteId`.
- **`originToRegExp(origin)`** — escapes regex metacharacters in an origin string and anchors the result with `^` for use in `propagateTo` / `ignoreUrls`.
- **`readUmamiConfig()`** — reads `VITE_UMAMI_WEBSITE_ID` + `VITE_UMAMI_SRC`; returns `undefined` if either is missing.
- **`readUmamiRequireConsent()`** — reads `VITE_UMAMI_REQUIRE_CONSENT`; defaults to `true` (consent required) unless the value is exactly the string `"false"`.
- **`readFaroConfig()`** — reads `VITE_FARO_URL` (required) plus optional `FARO_APP_NAME`, `FARO_APP_VERSION`, `FARO_ENVIRONMENT`; assembles `propagateTo` from the API URL and `ignoreUrls` from the collector URL + Umami origin.
- **`umamiOriginPattern()`** (private) — extracts the origin from the Umami `src` via a simple regex (avoids `new URL()` throwing on a malformed value); returns `[]` when analytics is off.
- **`propagationTargets(apiUrl)`** (private) — wraps a non-empty API URL into a single-element anchored-RegExp array; returns `[]` for same-origin (OpenTelemetry handles that by default).

## Notes

- **Dual-source env lookup.** Every value is read via `runtimeValue(key) ?? import.meta.env.VITE_<key>`. `runtimeValue` (imported from `@/infrastructure/runtime-config`) is the primary path; the `import.meta.env` access is the Vite-browser fallback.
- **`ignoreUrls` semantics.** A *string* entry is compared for exact equality with the request URL — it is never treated as a prefix. Multi-path coverage requires a `RegExp` entry.
- **`__APP_VERSION__`** is a Vite `define`-injected global, not an env var; it is used as the default `appVersion`.
- **`umamiOriginPattern` deliberately avoids `new URL()`.** A half-filled `VITE_UMAMI_SRC` must degrade to "no exclusion" rather than throw and take Faro down.
- **Consent default is strict.** Only the literal string `"false"` (case-insensitive) disables the consent gate; any other value, blank, or unset means consent is required.
