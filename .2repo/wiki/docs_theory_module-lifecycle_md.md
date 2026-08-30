# docs/theory/module-lifecycle.md

## Purpose

The operational how-to for adding and removing a domain module. Where `modules.md` explains *why* the shape is what it is, this page is the exact sequence of commands, files to create or delete, and checks to run. Its central claim—"a domain is one folder plus one registry line"—is validated by recorded cost measurements of a real scaffold addition and four real deletions.

## Key elements

- **Two registries** — `src/modules.ts` (the sole runtime registry; feeds router, navigation, response-schema map, i18n, analytics) and `tests/cross-cutting/backend-pairing.spec.ts` (names the backend counterpart per domain; fails on a missing entry).
- **Adding procedure (5 steps)** — create folder with `module.ts` + `routes.ts` → add one line to `src/modules.ts` → write `docs/modules/<name>.md` → add `BACKEND_PAIRING` entry + sidebar entry → `npm run build && npm run test:unit`.
- **The manifest (`module.ts`)** — a typed `AppModule` value declaring `name`, `routes`, `navigation`, `responseSchemas`, `locales`. `name` must match the folder; `navigation[].name` must be a route the module itself declares (enforced by `registry.spec.ts`).
- **`MODULE_EDGES` in `eslint.config.ts`** — the enforced allow-list for sibling imports; lint fails at the offending line if a module imports a sibling not listed there.
- **Removing procedure (4 steps)** — `rm -rf` the folder → delete the import + array entry in `src/modules.ts` → delete the docs page and the two registry entries (pairing spec + sidebar) → `npm run complete`; whatever fails is real coupling.
- **Failure taxonomy on deletion** — type-check/build failures = a tier knew which domains exist (FAIL); dead route strings = invisible FAIL; openapi parity table failing = correct signal.
- **Co-located e2e specs** — domain-specific Cypress specs live under `src/modules/<name>/tests/e2e/`, discovered by glob; cross-domain or shell-level specs stay central.
- **`tests/support/unit/wire-modules.ts`** — helper for tests that touch http or i18n, because `infrastructure` may not import `@/modules` and the app's module-scope wiring isn't available in isolation.

## Relationships

- **`docs/theory/modules.md`** — the theoretical companion; this page is explicitly "what you actually type" versus that page's "reasoning behind the shape." The manifest docblock convention (subdomain, sibling relationships as prose) is defined here and cross-referenced to `strategic-ddd.md`.
- **`docs/theory/reading-path.md`** — defines the intended reading order for the theory docs; this page is the action-oriented step after reading `modules.md`.
- **`README.md`** — top-level entry point; a reader following its links into `docs/theory/` reaches this page for the concrete add/remove workflow.
- **`docs/getting-started.md`** — onboarding path; this page is the "do it" reference that a new contributor consults after the theory pages.

## Notes

- **Contract asymmetry**: the frontend *consumes* `openapi.yaml` (generated `schemas.zod.ts` + `api/`); it does not own the contract. Deleting a module must not be confused with removing a backend contract fragment.
- **`index.ts` is optional**: add a barrel only when a sibling actually imports this module. An empty barrel is explicitly called out as "a promise nobody asked for."
- **The docblock is load-bearing prose**: `subdomain` and `dependsOn` were previously typed fields held to a cross-cutting spec; both were removed in favor of a JSDoc comment. The *enforced* boundary is now `MODULE_EDGES` in eslint, not the manifest.
- **Alphabetical order** in the `enabledModules` array is convention only—vue-router's path ranking makes splice order irrelevant for distinct paths.
- **Nothing needs rescoping** to add a module: `tsconfig.app.json`, Vitest `include`, coverage `include`, and Stryker `mutate` all already exclude `src/modules/<name>/tests/` by glob.
