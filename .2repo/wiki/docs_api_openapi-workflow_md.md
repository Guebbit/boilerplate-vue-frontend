# docs/api/openapi-workflow.md

## Purpose

Procedural guide for the OpenAPI-driven contract workflow: edit `openapi.yaml`, lint with Spectral, regenerate the typed client via orval, then update stores/views. It exists to enforce a single order of operations and to document the manual sync, CI freshness guard, and codegen conventions that are otherwise scattered across config files.

## Key elements

- **Workflow (mermaid flowchart):** Idea → edit `openapi.yaml` → `npm run lint:openapi` → `npm run gen:api` → update stores/views → `npm run test`.
- **Cross-repo sync section:** Documents the deliberate absence of a shared package or CI check between frontend and backend `openapi.yaml` copies; provides the manual `cp` + regenerate sequence and warns about past 39-line drift.
- **`api-freshness` CI job details:** Explains the two failure modes (stale pathspec, unformatted diff) and the requirement to update the pathspec whenever `orval.config.ts` output targets change.
- **Generated output (`contracts/rest/`):** `index.ts` (axios functions) and `schemas.zod.ts` (Zod schemas); both regenerated wholesale, never hand-edited.
- **Import convention:** Always use `@api` / `@api/schemas` aliases; never import by file path.
- **Enum handling:** Orval emits `as const` objects; use with `z.nativeEnum()`. Naming is `SchemaName + PropertyName` in PascalCase.
- **Orval config (`orval.config.ts`):** Three independent output blocks (`api`, `zodSchemas`, plus the split-by-content-type transformer). Documents the multipart split (`createProduct` vs `createProductWithMultipart`) and the per-call `options` parameter via `orvalMutator`.
- **Multipart caveat:** Orval skips encoding for multi-content-type operations; `splitByContentType` + inline transformer generates per-type variants. Do not hand-roll `FormData`.
- **Path-param encoding note:** `@orval/axios` ignores `urlEncodeParameters`; generated routes do not URL-encode path params.
- **Mocks stance:** No orval `mocks` block; dev/e2e use the paired backend's demo profile instead.
- **Commands:** `npm run lint:openapi`, `npm run gen:api`.

## Relationships

- **`docs/index.md`** — Linked as the "API overview" sibling page; this file is one of the two workflow docs (OpenAPI / AsyncAPI) hanging off that index.
- **`package.json`** — The npm scripts referenced throughout (`lint:openapi`, `gen:api`, `gen:asyncapi`, `prettier:fix`) are defined here; the CI `api-freshness` job and the `orval.config.ts` targets all ultimately resolve to scripts declared in this file.

## Notes

- The `api-freshness` CI job historically used a pathspec of `api/` (a non-existent directory), making it a no-op. If you touch `orval.config.ts` output targets, update the pathspec in the same commit and **verify the job can actually fail** by editing the spec without regenerating.
- Orval emits 2-space indentation; the repo commits 4-space. CI normalises with `npx prettier --write` before diffing. The manual sync sequence must also run `npm run prettier:fix`.
- The `options` parameter on generated functions is merged *after* the codegen config, so it cannot override url, method, or body.
- Multipart split applies to seven operations (anything with an optional image field). The JSON variant keeps the plain operation name; only the `WithMultipart` variant is new.
