# src/infrastructure/observability/config.ts

## Purpose

Pure environment-variable readers for the two telemetry back-ends (Grafana Faro and Umami). Each back-end is opt-in via a single env var; if that var is unset the reader returns `undefined` and the consuming store skips initialisation entirely. No I/O, no side effects — just typed config objects built from `import.meta.env`.

## Key elements

- **`FaroConfig`** (interface) — shape passed straight into `initializeFaro()`: `url`, `appName`, `appVersion`, `environment`, `apiOrigin`, `ignoreUrls`.
- **`UmamiConfig`** (interface) — tracker `src` and `websiteId` used to inject the Umami script.
- **`originToRegExp(origin)`** — escapes regex metacharacters in a string origin and returns an anchored `^`-pattern for `ignoreUrls`.
- **`readUmamiConfig()`** — returns `UmamiConfig | undefined`. Gate: `VITE_UMAMI_WEBSITE_ID` (trimmed). `src` defaults to `http://localhost:3080/script.js`.
- **`readFaroConfig()`** — returns `FaroConfig | undefined`. Gate: `VITE_FARO_URL` (trimmed). Optional fields fall back to defaults (`'frontend'`, `'1.0.0'`, `import.meta.env.MODE`, `VITE_API_URL` or `http://localhost:3000`). `ignoreUrls` excludes the collector URL (exact) and the Umami origin (anchored pattern) so telemetry POSTs don't create self-referential traces.
- **`umamiOriginPattern()`** (internal) — extracts the origin from the Umami `src` via regex (avoids `new URL()` throwing on malformed input); returns a one-element `RegExp[]` or `[]`.

## Relationships

- Consumed by `stores/observability.ts`, which checks the `undefined` return as the sole on/off switch for each back-end.
- Reads `VITE_API_URL` (the shared API-origin variable) for trace-header propagation into `FaroConfig.apiOrigin`.

## Notes

- **`ignoreUrls` matching semantics:** string entries are compared for *exact equality*, never as a prefix. Anything covering multiple paths must be a `RegExp`. This is why `umamiOriginPattern` returns a pattern rather than a bare string.
- **Opt-in is binary per back-end:** no partial configuration is possible. For Faro the gate is `VITE_FARO_URL`; for Umami it is `VITE_UMAMI_WEBSITE_ID`. All other vars are optional with defaults.
- **`apiOrigin` is shared:** it reads `VITE_API_URL`, not a dedicated `VITE_FARO_API_ORIGIN`. The default (`http://localhost:3000`) means local dev works without extra config.
- **`umamiOriginPattern` is intentionally defensive:** it regex-extracts the origin instead of using `URL` so a half-filled `VITE_UMAMI_SRC` degrades to "no exclusion" rather than crashing Faro initialisation.
