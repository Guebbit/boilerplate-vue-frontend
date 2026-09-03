# src/infrastructure/observability/config.ts

## Purpose

Pure environment-variable readers for the two telemetry back-ends (Grafana Faro and Umami analytics). Each reader returns `undefined` when its primary env var is unset, serving as the single opt-in switch that `store.ts` checks — a build with neither set ships the code but calls nothing.

## Key elements

- **`FaroConfig` (interface)** — Shape passed straight into `initializeFaro()`: receiver `url`, app identity fields, `apiOrigin` for W3C `traceparent` propagation, and `ignoreUrls` (exact-string or RegExp entries for un-instrumenting endpoints).
- **`UmamiConfig` (interface)** — Tracker script `src` and `websiteId`.
- **`originToRegExp(origin: string): RegExp`** — Escapes regex metacharacters and anchors the result at the start of the URL (`^…`).
- **`readUmamiConfig(): UmamiConfig | undefined`** — Reads `VITE_UMAMI_WEBSITE_ID` (the enable/disable switch) and `VITE_UMAMI_SRC` (defaults to `http://localhost:3080/script.js`). Returns `undefined` if the website id is blank.
- **`readFaroConfig(): FaroConfig | undefined`** — Reads `VITE_FARO_URL` (the enable/disable switch) plus optional fields with sensible defaults. Populates `ignoreUrls` with the collector URL (exact) and the Umami origin (anchored RegExp) so telemetry POSTs aren't traced. Returns `undefined` if the URL is blank.
- **`umamiOriginPattern(): RegExp[]` (module-private)** — Extracts the origin from the Umami `src` via regex match (avoids `new URL()` throwing on malformed values); returns an empty array when analytics is off or no origin is found. Shaped for spread-into `ignoreUrls`.

## Relationships

No graph neighbors recorded. The file is consumed by `store.ts` (per the module doc-comment) which checks the `undefined` return to decide whether to initialize Faro or inject the Umami script.

## Notes

- **Opt-in via `undefined`**: `store.ts` treats a non-`undefined` return as the sole enable signal. There is no boolean flag anywhere.
- **`ignoreUrls` matching semantics**: string entries are compared for *exact equality* with the request URL (not prefix), so multi-path exclusions must use a RegExp.
- **Defensive origin extraction**: `umamiOriginPattern` uses a regex match instead of `new URL()` so a half-filled `VITE_UMAMI_SRC` cannot throw and take Faro initialization down with it.
- **`apiOrigin` reuses `VITE_API_URL`**, not a dedicated `VITE_FARO_API_ORIGIN`, coupling Faro trace-stitching to the general API origin variable.
- **Defaults**: `appName` → `'frontend'`, `appVersion` → `'1.0.0'`, `environment` → `import.meta.env.MODE`, `apiOrigin` → `'http://localhost:3000'`, Umami `src` → local script URL. Only the primary URL/id has no default.
