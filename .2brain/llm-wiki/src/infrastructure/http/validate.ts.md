---
source: src/infrastructure/http/validate.ts
sha256: 0ff2106b791a17cbd1261376e11a2e90d4b8430b244fa0cb01d56aa911f53e83
signature: 1ebcc73a3640e6e4b39abccadd6950252ec59e969e0363a7eb8e0b7d1e3861ef
generated_at: 2026-11-10T03:07:06.013840+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/validate.ts

## Purpose

Runtime contract validation for the `orvalMutator` HTTP layer. It Zod-parses outgoing request bodies and incoming response bodies against the schemas resolved by the response-schema-map, enforcing at runtime the type guarantees the generated client makes. It gates on feature flags and a production-vs-dev distinction so that a backend adding a field never becomes a frontend outage.

## Key elements

- **`shouldValidateResponses()`** — Feature-flag gate (`VITE_VALIDATE_RESPONSES`). Defaults ON outside Vitest.
- **`shouldValidateRequests()`** — Same pattern for outgoing bodies (`VITE_VALIDATE_REQUESTS`). Validates only; never rewrites the payload.
- **`isReportOnly()`** — True when `PROD` is set and `VITE_CONTRACT_THROW !== 'true'`. Determines whether a mismatch is reported (Faro) or thrown.
- **`validateResponseAgainstContract(config, data)`** — Resolves the response schema for the route, `safeParse`s the body. In report-only mode, strips unknown keys on object schemas before parsing. On failure: captures diagnostic to Faro, logs all issues, and (outside report-only) throws a `syntheticProblem` envelope. Skips blob responses and unmapped routes (fail-open).
- **`validateRequestAgainstContract(config)`** — Resolves the request schema, `safeParse`s `config.data`. Skips non-JSON payloads (`FormData`, `Blob`). Same report-only/throw split as the response side.
- **`isJsonPayload(data)`** *(private)* — Guard ensuring only plain JSON objects are validated; excludes `FormData` and `Blob`.

## Relationships

- **`response-schema-map.ts`** — Source of `resolveResponseSchema`, `resolveRequestSchema`, and `isResponseSchemaTableLoading`. This file is the sole consumer that enforces the mapped schemas at request time.
- **`problem.ts`** — Provides `syntheticProblem`, used to build the `AxiosResponseErrorData` rejection envelope thrown on a hard contract mismatch.
- **`contract-mismatch-text.ts`** — Supplies the `CONTRACT_MISMATCH_TEXT` string interpolated into both response and request diagnostic messages.
- **`types.ts`** — Defines `AxiosResponseErrorData`, the shape that `validateResponseAgainstContract` throws and that downstream `catch` blocks destructure.
- **`index.ts`** — Barrel file for the `http` module; re-exports this file's public API.

## Notes

- **Vitest guard is load-bearing.** `import.meta.env.MODE !== 'test'` appears in both flag functions because Vitest sets `DEV: true`; without it, unit tests exercising `orvalMutator` with partial fixtures would throw.
- **Blob skip is keyed on `config.responseType === 'blob'`,** not `instanceof Blob`, so the check is runtime-agnostic (worker, SSR, etc.).
- **`.strip()` is applied conditionally** (only when `reportOnly && schema.type === 'object'`) to avoid pulling a zod value import into the entry chunk and to skip non-object schemas (e.g. `oneOf` login responses).
- **`VITE_CONTRACT_THROW=true`** is the opt-in to throwing in a production build; only the `build:e2e` script sets it. All other production builds fail open (report-only).
- **Unmapped routes fail open** (log, don't throw) because a missing map entry means the map is stale, not that the response is wrong. During lazy chunk loading the map reads as fully unmapped, so the warn is suppressed.
- **The thrown value is a `syntheticProblem` object, not a plain `Error`** — every downstream `catch` destructures the `AxiosResponseErrorData` shape; the eslint disable is intentional.
