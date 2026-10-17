---
source: src/infrastructure/observability/config.ts
sha256: 497087be244403de7455ed18c88e4ac10fa9113c00ea297dbc9d857a96327451
generated_at: 2026-10-17T00:11:32.272915+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/observability/config.ts

## Purpose

Reads `VITE_FARO_*` and `VITE_UMAMI_*` environment variables into typed config objects for the two telemetry backends (Grafana Faro tracing, Umami analytics). Each backend is entirely opt-in: if its required variable is unset, the reader returns `undefined`, which is the single switch `store.ts` checks to decide whether to initialize that backend.

## Key elements

- **`FaroConfig`** (interface) — Fields passed into `initializeFaro()`: collector `url`, `appName`, `appVersion`, `environment`, `propagateTo` (anchored Regexps for cross-origin trace-header propagation), `ignoreUrls` (strings matched by exact equality or Regexps for broader patterns).
- **`UmamiConfig`** (interface) — `src` (tracker script URL) and `websiteId`; both are required or analytics is disabled.
- **`originToRegExp(origin)`** — Escapes regex metacharacters and anchors the result at `^`, producing a start-of-URL match.
- **`readUmamiConfig()`** — Returns `UmamiConfig | undefined`. Falls back from `runtimeValue()` to `import.meta.env.VITE_UMAMI_*`; both `websiteId` and `src` must be non-blank.
- **`readUmamiRequireConsent()`** — Returns `false` only when the env value is exactly `"false"` (case-insensitive); everything else, including unset, yields `true`.
- **`readFaroConfig()`** — Returns `FaroConfig | undefined`. Requires `FARO_URL`; fills `appName`, `appVersion`, `environment` with sensible defaults. Composes `propagateTo` from the HTTP client's API URL and `ignoreUrls` from the collector URL plus the Umami origin pattern.
- **`umamiOriginPattern()`** *(private)* — Extracts the origin from Umami's `src` via regex (avoids `new URL()` throwing on malformed input); shaped as `RegExp[]` so it spreads into `ignoreUrls` uniformly.
- **`propagationTargets(apiUrl)`** *(private)* — Returns `[originToRegExp(apiUrl)]` for a cross-origin API, `[]` for same-origin (OpenTelemetry handles that by default).

## Relationships

- **Imports** `readApiUrl` and `runtimeValue` from `@/infrastructure/runtime-config` — the former supplies the API base URL for span-linking, the latter provides runtime-injected overrides ahead of build-time `import.meta.env` values.
- **Consumed by** `store.ts` (referenced in the module docblock), which gates Faro and Umami initialization on whether these readers return `undefined`.

## Notes

- `ignoreUrls` string entries are **exact-equality** matches, not prefixes. Anything covering multiple paths (e.g. Umami's `/api/send` beacon) must be a `RegExp`.
- `readFaroConfig` intentionally adds the Umami origin to `ignoreUrls` so the analytics beacon doesn't generate a root trace in Tempo — a trace produced by reporting is a trace about nothing.
- `propagateTo` reuses the HTTP client's API URL (via `readApiUrl()`) so the backend can *link* its spans to the browser's without joining the trace.
- `__APP_VERSION__` is a Vite/webpack compile-time define; it's the last fallback for `appVersion`.
- All env reads follow the same two-layer pattern: `runtimeValue(name) ?? import.meta.env.VITE_NAME?.trim()`, giving runtime-injected values precedence over build-time env.
