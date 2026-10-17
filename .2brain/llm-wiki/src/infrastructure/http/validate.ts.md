---
source: src/infrastructure/http/validate.ts
sha256: 8f4457c9e7b27e54b3b4964fda40efa6e680d6c1a3dec290be83fbd0e5ea07d9
generated_at: 2026-10-17T00:11:05.008453+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/validate.ts

## Purpose

Contract-validation layer for the `orvalMutator` HTTP client. It Zod-parses every response body (and, separately, every outgoing JSON body) against the schema that `response-schema-map.ts` resolves for the route. Behaviour is profile-dependent: dev/test/e2e profiles throw on mismatch so drift is caught at the source; production reports to Faro and lets the call through so a single additive backend field never becomes a frontend outage.

## Key elements

- **`shouldValidateResponses()`** – Feature-flag gate (`VITE_VALIDATE_RESPONSES`); defaults to **on** in every mode except `test`.
- **`shouldValidateRequests()`** – Twin gate for outgoing bodies (`VITE_VALIDATE_REQUESTS`); same default logic.
- **`isReportOnly()`** – Returns `true` when `import.meta.env.PROD` is set. Determines whether a mismatch throws (dev/test) or is only reported (prod).
- **`validateResponseAgainstContract(config, data)`** – Resolves the response schema for the route, `safeParse`s the already-unwrapped body. On mismatch: always captures the full issue list to Faro; in non-report-only mode throws an `AxiosResponseErrorData` envelope. In report-only mode, first applies `.strip()` so unknown additive keys don't fail, then returns silently. Unmapped routes are skipped (with a warn log unless the lazy schema chunk is still loading).
- **`validateRequestAgainstContract(config)`** – Same pattern for outgoing bodies. Skips non-JSON payloads (`FormData`, `Blob`, `null`). In report-only mode reports and sends anyway; otherwise throws a plain `Error` with the diagnostic.
- **`isJsonPayload(data)`** *(private)* – Guards that a body is a plain object (not `FormData`/`Blob`) before schema-parsing.

## Relationships

- **`./response-schema-map.ts`** – Provides `resolveResponseSchema`, `resolveRequestSchema`, and `isResponseSchemaTableLoading`. This file consumes those to obtain the Zod schema to validate against and to suppress warnings while the lazy schema chunk is still loading.
- **`./types.ts`** – Supplies the `AxiosResponseErrorData` type, which is the shape thrown by `validateResponseAgainstContract` on a hard mismatch (every downstream `catch` destructures this envelope).
- **`./index.ts`** – Barrel export; re-exports the public functions from this module so the rest of the codebase imports them via the package entry point.

## Notes

- `MODE !== 'test'` is **load-bearing**: Vitest also sets `DEV: true`, so a `!DEV` check alone would still validate in unit tests. The explicit `test` exclusion is what keeps deliberately-partial test fixtures from failing.
- In report-only (production) mode the schema is wrapped with `.strip()` *only* when it is a `z.ZodObject`. The generated schemas are always objects, but the map's declared return type is the wider `ZodType`, hence the `instanceof` guard.
- The response-path rejection is a plain object (`AxiosResponseErrorData`), **not** an `Error` instance. An eslint-disable suppresses `@typescript-eslint/only-throw-error` because every downstream consumer destructures the envelope shape.
- Request-path rejection (non-report-only) throws a standard `Error` with the diagnostic string — a different type from the response path.
- Unmapped routes **fail open** on both sides: the gap is treated as a stale map, not a bad payload. During the lazy-chunk loading window even mapped routes read as unmapped, so the `isResponseSchemaTableLoading()` check suppresses the warn to avoid a log storm.
