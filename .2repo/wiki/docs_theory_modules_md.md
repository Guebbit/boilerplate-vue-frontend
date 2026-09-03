# docs/theory/modules.md

## Purpose

Defines the architectural contract for the module system: the five-tier dependency hierarchy (app → modules → kernel → ui → infrastructure), the `AppModule` manifest, and the add/remove procedure. It is the *reasoning* behind the folder structure documented in `layers.md` — the "why" rather than the "where."

## Key elements

- **Five-tier model** — Strict one-directional dependency chain enforced by per-tier `no-restricted-imports` blocks in `eslint.config.ts`.
- **`AppModule` interface** — The typed manifest each module exports: `name`, `routes`, optional `navigation`, `responseSchemas`, `locales`. Replaces former shared enumeration files so that no file besides `src/modules.ts` names a domain.
- **Kernel tier** — Exactly one file (`registry.ts`). The only code whose purpose dissolves without modules. Everything domain-free that isn't the module system lives in `ui` or `infrastructure`.
- **Composition-root wiring** — `src/main.ts` calls `collectModuleResponseSchemas` / `collectModuleLocales` and registers them into infrastructure, pushing domain data *down* rather than letting infrastructure reach up.
- **`MODULE_EDGES`** — A generated ESLint rule naming, per module, which sibling barrels it may import. Violations fail `npm run lint`.
- **`locales` (lazy) vs `responseSchemas` (eager)** — Locales are per-locale per-domain chunks; the response-schema table must be registered before the first HTTP request.

## Relationships

- **`docs/modules/index.md`** — The "live version of this map": a hand-maintained context diagram of every edge with its relationship and reason. This page states the *rules*; that page shows the *current state*.
- **Individual module docs (`account`, `admin`, `cart`, `delivery`, `demo`, `feedback`, `inventory`, `locales`, `orders`, `payments`, `products`, `realtime`)** — Each module's `module.ts` follows the `AppModule` manifest defined here; navigation entries, locale bundles, and response schemas declared in those files are governed by the rules on this page.
- **`README.md` / `docs/getting-started.md`** — Higher-level entry points that reference the tier model as background context for onboarding readers.

## Notes

- **Test wiring is non-obvious:** Any unit test touching the HTTP client or i18n runtime must import `tests/support/unit/wire-modules.ts` to replicate the `src/main.ts` registration. Without it, the test silently exercises an app with no domain vocabulary and no schema validation.
- **`src/modules.ts` is the sole domain registry.** No other shared file enumerates enabled modules.
- **Naming history matters:** `core` → `infrastructure`, `platform` → `kernel`. The old names were overloaded (Nest/Angular `core`, VS Code `platform`), causing silent misreading. The backend repo carries the full comparison table in its own `docs/theory/modules.md`.
- **Strategic declarations (subdomain, inter-module relationship types) are prose in the `module.ts` docblock**, not typed fields — deliberately, to keep the claim adjacent to the code it describes.
