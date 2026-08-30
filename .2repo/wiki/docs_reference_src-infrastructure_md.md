# docs/reference/src-infrastructure.md

## Purpose

A reference map for the `src/infrastructure/` directory — the bottom tier that everything the app runs *on* (HTTP transport, i18n, non-domain Pinia stores, shared composables, observability, and generic utilities). It exists so a reader can locate the correct file by responsibility without reading source, and it enforces a hard boundary: this tier never imports from domain modules (enforced via `eslint.config.ts`).

## Key elements

- **`http/`** — Single axios instance, interceptors (token attachment), 401 refresh-and-retry flow, `{ data }` envelope unwrapping, response-schema validation, and URL normalisation. All generated API clients route through this; none build requests themselves.
- **`i18n/`** — vue-i18n instance, runtime locale overrides (admin-editable copy), and a locale-aware router-link helper kept out of the barrel to avoid pulling the router into dictionary consumers.
- **`stores/`** — Pinia stores that belong to no domain: `session` (token + minimal user info) and `observability` (Faro + Umami emission).
- **`composables/`** — App-specific glue: liveness-probe endpoint naming, form-validation answers, and upload-progress state.
- **`observability/`** — Environment-driven telemetry config, a byte-identical analytics event-name list (generated in the paired backend), and a typed `EventSource` SSE client.
- **`utils/`** — `logger` (sole `console` seam), `errors` (safe message extraction), `formatters` (dates, money, fallbacks), `uploads` (client-side multipart limits).

## Relationships

- **`src/infrastructure/http/index.ts`** — This page's `http/` section describes it as "the transport's public surface: one axios instance, its interceptors, and the single unwrap point." It is the entry file that re-exports the instance, interceptors, and envelope helpers that every generated client and store consumes.

## Notes

- The directory is described as "the mirror of the backend's tier of the same name" — naming and responsibilities intentionally parallel the server-side `infrastructure/` layer.
- `eslint.config.ts` enforces that no file in this tier can import from domain modules; treat that boundary as load-bearing.
- `i18n/router-link.ts` is deliberately **not** re-exported by the i18n barrel; import it by its own path to avoid dragging the router into every dictionary consumer.
- `observability/analytics-events.ts` is generated in the paired backend and copied byte-identical here — do not hand-edit; changes must originate from the backend generation step.
- `http/refresh.ts` maintains an explicit exclusion list (login, refresh endpoints) where a 401 is a terminal answer, not a stale-token trigger.
