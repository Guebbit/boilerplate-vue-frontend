---
source: orval.config.ts
sha256: 404b30250107e4ba8a28ce3dfef0826c9c3b5497a05479a17d8b02e62e957e02
generated_at: 2026-10-02T11:24:35.663784+00:00
model: ollama:qwen3.8:27b
---

# orval.config.ts

## Purpose

Orval configuration that generates two artifacts from `openapi.yaml`: typed axios request functions (`contracts/rest/index.ts`) and Zod schemas (`contracts/rest/schemas.zod.ts`). It exists so the API client layer is always in lockstep with the OpenAPI spec rather than hand-maintained.

## Key elements

- **`contentTypeOperationNames`** – A custom Orval transformer applied when `splitByContentType` is enabled. Strips the `WithJson` suffix (restoring the plain operation name) and renames `WithFormData` → `WithMultipart`, so existing JSON call sites are unaffected and the multipart variant matches the `*RequestMultipart` type naming already in the spec.
- **`api` block** – Generates a single-file (`mode: 'single'`) set of axios-function exports targeting `./contracts/rest/index.ts`. Routes all calls through `orvalMutator` (imported from `./src/infrastructure/http/index.ts`), which provides auth headers, token refresh, and an `options?` parameter that lets callers pass `onUploadProgress` for multipart uploads.
- **`zodSchemas` block** – Emits Zod schemas into `./contracts/rest/schemas.zod.ts`. All object schemas use `zod.strictObject` (unknown keys are rejected), matching the spec's `additionalProperties: false` on 92 of 94 object models. Free-form maps (`ErrorItem.details`, audit `metadata`) generate as `zod.record` and are unaffected.
- **`export default defineConfig({...})`** – The sole export; consumed by the `orval` CLI.

## Relationships

No graph neighbors are recorded for this file. It *reads* `./openapi.yaml` as input and *writes* to `./contracts/rest/index.ts` and `./contracts/rest/schemas.zod.ts`. The mutator path references `./src/infrastructure/http/index.ts`. The CI pathspec in `.github/workflows/ci.yml` must include both target paths to keep freshness checks effective.

## Notes

- **No `mocks` block is intentional.** Dev and e2e run against the paired backend's in-memory demo profile, not MSW handlers. If a spec-ahead, backend-less mode is ever needed, the intended wiring is `mode: 'split'` + `mock: true`, emitting handlers into a separate `index.msw.ts` loaded only via a flag-guarded dynamic import.
- **`client` is left at the default `axios-functions`.** The alternative clients (`axios`, `vue-query`, `fetch`, framework-specific) do not match this repo's axios + Pinia-store architecture.
- **`strict` Zod flag should not be disabled.** If a schema genuinely needs to accept unknown keys, model it as a free-form map in the spec instead of turning the flag off.
- **CI coupling:** any new `target` path added here must also be added to the `api-freshness` job's pathspec in `.github/workflows/ci.yml`, or changes to it will ship unguarded.
