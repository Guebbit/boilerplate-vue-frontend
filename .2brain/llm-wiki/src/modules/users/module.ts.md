---
source: src/modules/users/module.ts
sha256: c4e109aafb196f17e394219af4b66104e8d873c7f56ad1617d7347a538603d58
generated_at: 2026-10-17T01:46:09.239990+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/module.ts

## Purpose
Module manifest for the **users** module. It registers the module's routes, admin navigation entry, response schemas, and locale files into the app's central module registry so the kernel can wire everything together at startup.

## Key elements
- **default export** (`satisfies AppModule`): the single module descriptor object.
  - `name` / `loadingKeys` — identity and i18n loading key (`'users'`).
  - `routes` — the route table imported from `./routes.ts`.
  - `navigation` — one entry: `UsersList` in the `admin` section (order 50, `Users` icon from `lucide-vue-next`, i18n label `navigation.label-users-list`).
  - `responseSchemas` — lazy-imports `./response-schemas` and re-exports `usersResponseSchemas`.
  - `locales` — lazy-imports `./locales/en.json` and `./locales/it.json`, piping each through the shared `dictionary` helper from `@/kernel/registry`.

## Relationships
- **`src/modules/users/routes.ts`** — imported directly (`import routes from './routes'`) and attached to the manifest's `routes` field. This is the file's only runtime import; all other resources (schemas, locales) are deferred behind dynamic `import()` calls.

## Notes
- The JSDoc block on the export explicitly states the dependency direction: the **accounts** module depends on *users* (for shared field rules), never the reverse. A user record is independent of any active session.
- Locale files are funneled through the `dictionary` function (imported from `@/kernel/registry`) rather than used as raw JSON, so any post-processing the kernel applies to locale data is guaranteed here.
- `satisfies AppModule` is used instead of a type annotation, preserving the inferred literal types on the manifest while still enforcing the registry contract.
