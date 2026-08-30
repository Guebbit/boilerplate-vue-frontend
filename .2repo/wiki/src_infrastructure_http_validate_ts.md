# src/infrastructure/http/validate.ts

## Purpose

Contract validation gate for the `orvalMutator` HTTP client. After a response is unwrapped, this module optionally parses the body against the Zod schema resolved for that request — throwing a detailed error on a real schema mismatch and logging a warning (fail-open) when no schema is mapped. A feature flag controls whether the check runs at all.

## Key elements

- **`shouldValidateResponses()`** — Reads `VITE_VALIDATE_RESPONSES` (`'true'` / `'false'`). If unset, validation is **on** in every mode except `test` (where `MODE !== 'test'` short-circuits to `false`).
- **`validateResponseAgainstContract(config, data)`** — Resolves the schema via `resolveResponseSchema(config.method, config.url)`. If no schema exists, logs a warning and returns (fail-open). Otherwise runs `schema.safeParse(data)`; on failure throws an `Error` listing **every** issue (path + message), not just the first.

## Relationships

- **`./response-schema-map.ts`** — Provides `resolveResponseSchema(method, url)` which returns the Zod schema (or `null`) for a given route. This module is its sole consumer at runtime.
- **`src/infrastructure/http/index.ts`** — The HTTP infrastructure barrel; this module's exports flow through it to the `orvalMutator` call-site that invokes `validateResponseAgainstContract` after each successful unwrap.

## Notes

- **Feature flag defaults ON in production.** The rationale: generated envelope types promise `data` on every 2xx, and stores rely on that. Validation converts a malformed 200 into a loud rejection at the single unwrap point rather than a silently empty page.
- **`MODE !== 'test'` is load-bearing.** Vitest also sets `DEV: true`, so checking `DEV` alone would leave unit tests (which use deliberately partial fixtures) subject to strict validation.
- **Fail-open on unmapped routes is intentional.** A missing entry means the map is stale, not that the response is wrong — throwing here would be a false positive.
- **No extra bundle cost.** `response-schema-map` was already a static import of this module; the flag gates runtime behavior, not code presence.
- **FE-side mirror of the BE's `toSatisfyApiSpec()` suite.** The backend asserts responses against `openapi.yaml` internally; this module asserts them against the generated schemas externally over a real network in every environment a user or spec actually drives.
