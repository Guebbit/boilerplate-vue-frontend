---
source: src/infrastructure/http/validate.ts
sha256: d6650edc19880d54606b7ff4250c3f978b121070a3f7690d45b456fd71bec247
generated_at: 2026-10-02T11:59:50.278553+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/validate.ts

## Purpose

Contract-validation gate for the `orvalMutator` HTTP layer. It parses response bodies and outgoing JSON request bodies against the Zod schemas resolved from the OpenAPI spec, deciding per-profile whether a mismatch is fatal (throw) or advisory (report to Faro and continue). Its job is to make the generated envelope types' "every 2xx has `data`" promise actually hold in production, and to surface drift early in dev/e2e.

## Key elements

- **`shouldValidateResponses()`** — Feature-flag reader (`VITE_VALIDATE_RESPONSES`). Defaults to ON everywhere except `MODE === 'test'`.
- **`shouldValidateRequests()`** — Same pattern for `VITE_VALIDATE_RESPONSES` → `VITE_VALIDATE_REQUESTS`. Defaults to ON outside Vitest.
- **`isReportOnly()`** — Returns `true` when `import.meta.env.PROD`. In this mode mismatches are reported to Faro and the payload passes through unchanged; otherwise they throw.
- **`validateResponseAgainstContract(config, data)`** — Resolves the response schema for the route, parses with Zod. Unmapped routes (including the lazy-chunk loading window) fail open with a `logger.warn`. In report-only mode, object schemas get `.strip()` before parsing so additive backend fields are tolerated. On a real mismatch: captures a multi-issue diagnostic to Faro, then either throws an `AxiosResponseErrorData` envelope (dev/e2e) or returns silently (prod).
- **`isJsonPayload(data)`** — Private helper. Returns `false` for `FormData`, `Blob`, `null`, and non-objects so multipart/binary bodies are never fed to JSON schemas.
- **`validateRequestAgainstContract(config)`** — Resolves the request-body schema, parses with Zod. Unmapped or non-JSON bodies are skipped. Mismatch: reports to Faro, throws in dev/e2e, passes through in prod.

## Relationships

- **`./response-schema-map.ts`** — Source of `resolveResponseSchema`, `resolveRequestSchema`, and `isResponseSchemaTableLoading`. All three are called to decide whether a route has a contract and whether the lazy schema chunk is still loading.
- **`./types.ts`** — Provides the `AxiosResponseErrorData` type used as the thrown envelope shape in `validateResponseAgainstContract`.
- **`index.ts`** — Barrel module; re-exports the public functions from this file for downstream import.

## Notes

- **`.strip()` is conditional on `instanceof z.ZodObject`.** The map's declared return type is the wider `ZodType`, so the guard is a cast-safety measure, not a runtime branch in practice.
- **Vitest sets `DEV: true`**, which is why both flag readers explicitly check `MODE !== 'test'` rather than relying on the dev flag.
- **Unmapped-route silence during schema-chunk loading** (`isResponseSchemaTableLoading`) is intentional: the lazy import (FA94/FA-D2) makes every route appear unmapped for a brief window; warning during that window would be noise.
- **The thrown object is a plain literal satisfying `AxiosResponseErrorData`**, not an `Error` instance. Downstream catch blocks destructure this shape; an eslint-disable suppresses the `only-throw-error` rule.
- **Validation never mutates the body.** Coercing `''` → `null` etc. is `toRequestBody`'s responsibility one layer up.
