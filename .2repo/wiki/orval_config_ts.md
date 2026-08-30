# orval.config.ts

## Purpose

Orval configuration that generates two artifacts from `./openapi.yaml`: a typed axios API client (`contracts/rest/index.ts`) and Zod schemas (`contracts/rest/schemas.zod.ts`). It also applies a custom transformer to normalise operation names when `splitByContentType` is enabled.

## Key elements

- **`contentTypeOperationNames`** (local function, transformer) — For operations Orval splits by content type, strips the `WithJson` suffix (restoring the plain name) and renames `WithFormData` → `WithMultipart`. Single-content-type operations pass through unchanged.
- **`api` block** — Generates `mode: 'single'` axios-functions into `contracts/rest/index.ts`. Routes calls through `orvalMutator` (from `src/infrastructure/http/index.ts`), which accepts an extra `options` param so callers can pass `onUploadProgress`. Enables `splitByContentType` and applies the transformer above.
- **`zodSchemas` block** — Generates Zod schemas into `contracts/rest/schemas.zod.ts` with `strict: true` on all five positions (response, body, query, param, header), producing `zod.strictObject` so undeclared keys are rejected rather than silently stripped.
- **Default export** — The `defineConfig({...})` object combining both targets.

## Relationships

No graph neighbors are recorded for this file. It references `./openapi.yaml` (input), `./src/infrastructure/http/index.ts` (mutator), and the two generated targets as outputs.

## Notes

- **CI pathspec coupling:** Every `target` path in this file must also appear in the `api-freshness` job's pathspec in `.github/workflows/ci.yml`; otherwise spec changes ship without a freshness check.
- **No `mocks` block by design.** Dev and e2e hit the paired backend's demo profile. If a backend-less mode is ever needed, the intended wiring is `mode: 'split'` + `mock: true` emitting into a separate `index.msw.ts` pulled in only via a flag-guarded dynamic import.
- **`client` is left at the default `'axios-functions'`** (plain top-level exports, no factory). Alternatives like `vue-query` or `fetch` don't fit the current axios + Pinia-store setup.
- **Strict Zod is intentionally on.** The spec marks 92 of 94 object schemas as `additionalProperties: false`; the two free-form maps (`ErrorItem.details`, audit `metadata`) generate as `zod.record` and are unaffected. If a schema needs unknown keys, model it as a map in the spec rather than disabling strict mode.
- **Mutator `options` param:** `orvalMutator` accepts a second argument, so every generated function exposes an `options?` parameter forwarded to axios. This is the mechanism that lets image uploads pass `onUploadProgress` through the generated client.
