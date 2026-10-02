---
tags:
  - 2brain
  - 2brain/module
  - project/boilerplate-vue-frontend
type: module
module: scripts/contracts/
files: 8
updated: 2026-10-02T19:23:07.830936+00:00
---

# scripts/contracts/

## Purpose

This module holds the set of code generators and validation CLIs that derive TypeScript contract artifacts from the repo's canonical API specification files (`openapi.yaml`, `asyncapi.yaml`, `authorization-keys.yaml`). Running these scripts keeps generated types, constants, and cross-cutting metadata in lockstep with the specs, so hand-maintained copies don't drift.

## Key parts

- **AsyncAPI pipeline** — `generate-asyncapi-types.ts` reads the AsyncAPI spec and emits payload interfaces, channel constants, SSE event maps, and inlined JSON-Schema maps (used by the SSE client for runtime Zod validation); `validate-asyncapi.ts` is a lightweight replacement for `@asyncapi/cli` that runs the same spectral ruleset without the 446 MB bundle.
- **OpenAPI-derived generators** — `generate-error-codes.ts` (error-code constants + union type from `x-error-codes`), `generate-operation-modules.ts` (maps every `@api` function to its owning `x-module`), and `generate-route-table.ts` (emits a dependency-free `ROUTES` array with method, URL regex, schema name, and module per operation) all read extensions from `openapi.yaml`. `strip-schema-descriptions.ts` runs last in `gen:api` to remove dead `.describe()` strings from the orval schema bundle.
- **Permission-action generator** — `generate-permission-actions.ts` is the CLI entry point (reads `authorization-keys.yaml`, writes the output file); `permission-actions-render.ts` is its pure, side-effect-free rendering half so the logic is unit-testable without filesystem I/O.

## How it connects

This module is a leaf in the dependency graph: it has no runtime imports from other repo modules. Its *outputs* (the generated `.ts` files under `contracts/` and the runtime `ROUTES` table) are consumed by the REST/SSE clients, the response-schema map, cross-cutting coupling tests, and CI freshness gates, but the generators themselves depend only on the spec YAML files and third-party tooling (orval output, Zod, AsyncAPI parser).

## Where to start

1. **`generate-error-codes.ts`** — the shortest generator; it shows the read-YAML-extension → render-TypeScript pattern that every other script in this directory follows.
2. **`generate-route-table.ts`** — the most widely consumed output; reading it clarifies how the route table becomes the lookup key the runtime schema map and per-module response schemas rely on.

## Connected modules
_(none)_

## Files
- `scripts/contracts/generate-asyncapi-types.ts` — CLI script that reads `asyncapi.yaml` and emits a TypeScript file (`contracts/asyncapi.generated.ts`) containing realtime contract types: payload interfaces, message aliases, per-namespace channel constants, SSE event-name/payload maps, and fully inlined JSON Schema maps. The schema maps exist so `create-sse-client.ts` can validate SSE frames at runtime via Zod's `fromJSONSchema`. A `--check` flag enables a no-write, exit-on-mismatch mode for CI gating.
- `scripts/contracts/generate-error-codes.ts` — Generates a TypeScript constants object (`ERROR_CODES`) and a derived union type (`ErrorCode`) from the `x-error-codes` extension in `openapi.yaml`. It exists so call sites can reference `ERROR_CODES.CART_EMPTY` instead of retyping strings, while keeping the wire contract's `errors[].code` as an open `string` (no `enum`), per CT-D5 / Zalando API guideline #112.
- `scripts/contracts/generate-operation-modules.ts` — Generates a TypeScript map (`OPERATION_MODULES`) that links every orval-produced `@api` function name to the backend module owning its OpenAPI operation, sourced from `x-module` extension stamps in `openapi.yaml`. It exists so cross-cutting coupling tests have a single, auto-maintained reference instead of a hand-written list, and so `--check` can detect drift in CI.
- `scripts/contracts/generate-permission-actions.ts` — CLI script (run via `tsx`) that reads the `actions:` block from an `authorization-keys.yaml` file and generates a TypeScript module containing both a runtime array and a derived union type of permission actions. It exists so that frontend and backend repos can produce identical permission-action type definitions from a shared YAML source, keeping the vocabulary in sync.
- `scripts/contracts/generate-route-table.ts` — Code generator that reads the repo's `openapi.yaml` and emits a typed `ROUTES` array (one `GeneratedRoute` row per declared operation) describing each endpoint's HTTP method, an anchored regex URL pattern, the `@api/schemas` response-envelope export name, an optional body-schema name, and the owning `x-module`. The output is consumed at runtime by `infrastructure/http/response-schema-map.ts` and by each module's own `response-schemas.ts` before the large zod schema bundle is loaded, keeping the route table a dependency-free string table.
- `scripts/contracts/permission-actions-render.ts` — The pure, side-effect-free half of the permission-action code generator. It reads the `actions:` list out of the shared `authorization-keys.yaml` document and renders the TypeScript module that carries that list as a frozen array plus a union type. All I/O lives in the sibling script; this file exists so the logic can be unit-tested without touching the filesystem.
- `scripts/contracts/strip-schema-descriptions.ts` — Post-generation cleanup that removes every Zod `.describe(...)` call from the orval-generated schema file (`contracts/rest/schemas.zod.ts`). Orval emits one for each OpenAPI `description` field (~1,700 total), but the schemas are only ever `.safeParse()`d at runtime — the strings are dead bundle weight. This script runs as the last step of `gen:api`, so both the committed file and the `api-freshness` CI job see the stripped output.
- `scripts/contracts/validate-asyncapi.ts` — A standalone CLI script that validates AsyncAPI documents using `@asyncapi/parser` and its `spectral:asyncapi/recommended` ruleset. It replaces the removed `@asyncapi/cli` (`asyncapi validate`) while producing identical diagnostics, dropping the ~446 MB CLI bundle and its telemetry.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
