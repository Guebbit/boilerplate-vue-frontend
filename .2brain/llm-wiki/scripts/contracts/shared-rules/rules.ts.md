---
source: scripts/contracts/shared-rules/rules.ts
sha256: f308bcec7664ed3841ab642facfb70885865fa9340200601878d6ff3b15f51b5
signature: 48b18a161f03299eb2ff28f1e0e994195942d591586f44246029cfc5c9eb1237
generated_at: 2026-11-10T02:27:25.516768+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/shared-rules/rules.ts

## Purpose

Central registry of every frontend-owned rules YAML file under `shared/rules/`. Each entry defines a Zod schema that validates the YAML, an optional `derive` step that merges in backend data, and a `GenerateSpec` that tells the codegen which constants to emit. Adding a new rules file means writing one schema and one row in `SHARED_RULES`; everything else (JSON-Schema export, TS generation) is handled by `generate-shared-rules.ts`.

## Key elements

- **`camelId`** – Zod string schema enforcing `^[a-z][\dA-Za-z]*$`; used as a map-key type because keys double as translation keys.
- **`storageKind`** – Zod enum: `cookie` | `localStorage` | `sessionStorage`.
- **`browserStorageSchema` / `BrowserStorageRules`** – Strict-object schema for `shared/rules/browser-storage.yaml`: an ordered `order` array and an `items` record describing each row's `name`, `setter`, `kind`, `necessity`, and optional `when` gate.
- **`syncedCookiesSchema` / `SyncedCookies`** – Loose-object schema for the frontend slice of the backend's `contracts/cookies.yaml`. Intentionally permissive so new backend fields don't break this build; `necessity` is pinned to the literal `'necessary'`.
- **`staticPagesSchema`** – Schema for `shared/rules/static-pages.yaml`: a non-empty array of lowercase page slugs with a uniqueness refine.
- **`toursSchema`** – Schema for `shared/rules/tours.yaml`: a record of tours (id → `{ version, auto? }`) with a non-empty refine.
- **`LoadRules`** – Type alias for a generic YAML loader: `(relative: string, schema: T) => z.infer<T>`.
- **`SharedRule`** – Interface describing one rules entry: `source`, `schema`, optional `derive`, `inputs`, and `generate: GenerateSpec`.
- **`SHARED_RULES`** – The main export. A `satisfies Record<string, SharedRule>` record with entries for `'browser-storage'`, `'static-pages'`, and `'tours'`.

## Relationships

- **`scripts/contracts/generate-shared-rules.ts`** – Consumes `SHARED_RULES` to read each YAML, validate it against the schema, run `derive` if present, and emit both the generated TS file and a JSON-Schema copy.
- **`scripts/contracts/shared-rules/browser-storage.ts`** – Provides `buildBrowserStorage`, called in the `derive` step of the `'browser-storage'` entry to merge frontend rows with backend cookies.
- **`scripts/contracts/shared-rules/generate-spec.ts`** – This file imports the `GenerateSpec` type from it; `SharedRule.generate` is typed as `GenerateSpec`.
- **`tests/unit/scripts/contracts/shared-rules.spec.ts`** – Unit-tests the Zod schemas (happy paths, rejects, refine messages).

## Notes

- `syncedCookiesSchema` deliberately uses `z.looseObject` and `z.literal('necessary')`: the backend owns additional fields (`purpose`, `secret`, `lifetime`), and the frontend has no vocabulary for the backend's `preference` necessity value. A build failure is the intended signal if the backend changes that field.
- `SHARED_RULES` uses `as const satisfies` rather than `as` or a plain annotation, preserving literal types for downstream tooling while still enforcing the `SharedRule` shape.
- The `inputs` array on each entry is the authoritative list of source files named in the generated file's header; keep it in sync with `source` and any backend files read by `derive`.
- Tour ids allow hyphens (`^[a-z][\da-z-]*$`), unlike the camelCase rule used elsewhere.
