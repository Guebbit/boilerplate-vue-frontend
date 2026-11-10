---
source: tsconfig.app.json
sha256: c58d684e17832218b17939cebc01577e9b64fa5bdb34c91ba3185fcc6f33b4a6
signature: c58d684e17832218b17939cebc01577e9b64fa5bdb34c91ba3185fcc6f33b4a6
generated_at: 2026-11-10T08:32:31.785239+00:00
model: ollama:qwen3.8:27b
---

# tsconfig.app.json

## Purpose

TypeScript project configuration for the main application build. It extends the Vue DOM preset, scopes type-checking to application source and API contracts (excluding module-level tests), and establishes the path aliases used across the codebase.

## Key elements

- **`extends`** — inherits compiler options from `@vue/tsconfig/tsconfig.dom.json`.
- **`include`** — covers `contracts/rest`, the two generated contract files (`asyncapi.generated.ts`, `permission-vocabulary.ts`), all of `src/**/*`, and all `.vue` SFCs.
- **`exclude`** — drops `src/modules/*/tests/**` so Cypress and Vitest ambient types stay out of this project.
- **`composite: true` + `noEmit: true`** — marks this as a project-reference participant while suppressing output; type-checking only.
- **`tsBuildInfoFile`** — incremental-build cache stored in `node_modules/.tmp/`.
- **`types: ["vite/client"]`** — restricts ambient type loading to Vite client types only.
- **`paths` aliases**:
  - `@/*` → `./src/*` — standard source root.
  - `@types` → `./src/types`.
  - `@api` → `./contracts/rest/index` — generated REST client.
  - `@api/schemas` → `./contracts/rest/schemas.zod` — Zod schemas from the generated client.
  - `@api/error-codes` → `./contracts/rest/error-codes`.
  - `@api/routes` → `./contracts/rest/routes`.
  - `@api/upload-types` → `./contracts/rest/upload-types`.
  - `@api/permission-vocabulary` → `./contracts/permission-vocabulary`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `@api/*` aliases are intentional indirection: every module's store imports the generated client via `@api/…` rather than a relative path, so relocating the generated output is a single `paths` entry change (see the inline comment in the file).
- Test code is deliberately excluded at two levels: module-internal tests via `exclude`, and the `support/e2e` / `support/unit` directories by simply not listing them in `include`. Each has its own project file for its own test-runner ambient types (Cypress, Vitest).
- Because `noEmit` is set, this config is consumed by the type-checker / editor only; it does not produce JS output.
