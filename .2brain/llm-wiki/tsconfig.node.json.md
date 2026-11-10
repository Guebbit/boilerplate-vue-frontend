---
source: tsconfig.node.json
sha256: 89848960d64a49a70b5f5525967c159ececaa42c44e576fdcf876ef57d3fd7ee
signature: 89848960d64a49a70b5f5525967c159ececaa42c44e576fdcf876ef57d3fd7ee
generated_at: 2026-11-10T08:33:22.333744+00:00
model: ollama:qwen3.8:27b
---

# tsconfig.node.json

## Purpose

A TypeScript project-reference config that type-checks the Node.js-side tooling and support files (build configs, scripts, e2e/lighthouse test helpers) against the Node 24 type definitions. It exists to isolate server/tooling code from the browser-facing `tsconfig.json`, allowing independent compilation settings (Bundler resolution, Node types) without polluting the app's type environment.

## Key elements

- **`extends: "@tsconfig/node24/tsconfig.json"`** — inherits Node 24 baseline compiler options (target, lib, strict flags).
- **`include`** — explicit list of tooling and test-support files (config files for Vite, Vitest, Orval, Knip, Cypress, `scripts/**/*.ts`, a handful of UI/infra modules, and all e2e/lighthouse test support). Only these files are type-checked by this project.
- **`composite: true` + `noEmit: true`** — marks this as a project reference (so other tsconfigs can depend on it) while suppressing JS output; the build is type-check-only.
- **`tsBuildInfoFile`** — caches incremental build state in `node_modules/.tmp/` for faster repeated checks.
- **`module: "ESNext"`, `moduleResolution: "Bundler"`** — lets the tooling files use ESM syntax while relying on the bundler (Vite) for resolution rather than Node's CJS/ESM lookup.
- **`types: ["node"]`** — restricts global type augmentations to `@types/node` only, keeping browser globals out.

## Relationships

- **`vitest.config.ts`** and **`vitest.config.mutation.ts`** — both fall under the `vitest.config.*` glob in this file's `include` array, so they are type-checked using this project's Node 24 / Bundler-resolution settings rather than the browser tsconfig.

## Notes

- Despite `composite: true`, the `noEmit: true` setting means no `.js` files are ever produced; the "composite" flag is used purely to satisfy the project-references protocol so a parent or dependent tsconfig can list this as a `references` entry.
- The `include` list is deliberately narrow and hand-maintained. Adding a new script or e2e helper that needs Node types requires adding it here; forgetting to do so will cause that file to fall under the browser tsconfig and likely produce `Cannot find module 'node:…'` errors.
- `moduleResolution: "Bundler"` means extensionless relative imports work (Vite resolves them), but running any of these files directly under plain `node` will fail at runtime if the extension is omitted.
