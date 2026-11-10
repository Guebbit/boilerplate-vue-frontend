---
source: orval.config.ts
sha256: 3cba5e3a6c72a31751845097c268594e239c2b602da66ba0960ae4b1821b41f4
signature: 4176a393815448134adf38e755907d91dc9420fe0b89b9390519e72c5cae9138
generated_at: 2026-11-10T02:17:54.891944+00:00
model: ollama:qwen3.8:27b
---

# orval.config.ts

## Purpose

Orval build configuration that generates a typed Axios API client and Zod schemas from `./openapi.yaml`. It exists so the runtime HTTP layer and the validation layer are both derived from a single OpenAPI spec, keeping them in sync automatically.

## Key elements

- **`contentTypeOperationNames`** (local const) — Transformer applied after `splitByContentType`. Replaces the trailing `/WithJson$/` suffix (restoring the plain operation name) and replaces `/WithFormData$/` with `WithMultipart`. Single-content-type operations pass through untouched.
- **`api`** (config target) — Emits plain exported Axios functions into `contracts/rest/index.ts`. Uses `mode: 'single'`, the default `axios-functions` client, and routes all calls through `orvalMutator` in `src/infrastructure/http/index.ts`. Enables `splitByContentType: true` plus the transformer above.
- **`zodSchemas`** (config target) — Emits Zod schemas into `contracts/rest/schemas.zod.ts`. Sets `strict: true` on all five Zod positions (response, body, query, param, header), producing `zod.strictObject` so undeclared keys are rejected rather than stripped.
- **`defineConfig`** (default export) — The top-level Orval configuration object tying both targets together.

## Relationships

- **`github/workflows/ci.yml`** — The `api-freshness` job in CI uses a pathspec that must include every `target` path defined in this file. If a target is added or moved here without updating that pathspec, changes to the generated output ship without the freshness guard.

## Notes

- **No `mocks` block is intentional.** Dev and e2e tests run against the paired backend's demo profile (real API, in-memory, seeded), so generated MSW/faker stubs would add no coverage. If a backend-less render-only mode is ever needed, the documented wiring is `mode: 'split'` + `mock: true`, emitting handlers into a separate `index.msw.ts` pulled in only via a flag-guarded dynamic import.
- **`splitByContentType` is a workaround for an Orval limitation:** Orval only emits `FormData` encoding when an operation has a *single* request content type. Eight operations accept both JSON and multipart; without this split they would fall through with no encoding at all.
- **Zod strictness is blanket by design.** 92 of the spec's object schemas declare `additionalProperties: false`; the two exceptions (`ErrorItem.details`, audit `metadata`) generate as `zod.record` and are unaffected. Do not disable strict mode — model any legitimate open shape as a free-form map in the spec instead.
- **`orvalMutator` accepts a second `options` param** forwarded to Axios, which is what allows callers (e.g. image uploads) to pass `onUploadProgress` through the generated client rather than calling the mutator directly.
