# docs/theory/modules.md

## Purpose

Documents the module system's design contract: what a module is, the five-tier dependency hierarchy, the `AppModule` manifest, and the rules governing adding or deleting a domain. It is the reasoning layer behind the folder structure (the "why"), as opposed to `layers.md` which is the map (the "where").

## Key elements

- **Five-tier hierarchy** (`app → modules → kernel → ui → infrastructure`): every import arrow points down; `eslint.config.ts` enforces each edge via per-tier `no-restricted-imports` blocks.
- **`AppModule` interface**: the single typed manifest (`name`, `routes`, `navigation?`, `responseSchemas?`, `locales?`) that replaces former shared enumeration files. `locales` is lazy (code-split per domain/locale); `responseSchemas` is eager (http client needs them before first request).
- **`infrastructure` / `kernel` test**: "If this project had no modules, would this file still make sense?" Yes → infrastructure/ui. No → kernel. Kernel currently contains exactly one file: `registry.ts`.
- **Composition-root hand-down**: `main.ts` calls `collectModuleResponseSchemas` / `collectModuleLocales` and passes results into `infrastructure` at startup, because the bottom tier may never import `@/modules`.
- **Module edges**: a generated ESLint rule (`MODULE_EDGES` in `eslint.config.ts`) restricts which sibling barrels each module may import; violations fail `npm run lint`.
- **Deletion test**: removing a domain = `rm -rf` one folder + delete one line from `src/modules.ts`; `complete` must stay green.
- **Naming rationale**: `kernel` (microkernel loading plugins it has never heard of) and `infrastructure` (framework-coupled substrate) were renamed from `platform` and `core` to avoid cross-industry overloading.

## Relationships

- **`docs/theory/layers.md`** — this page explicitly positions itself as the reasoning complement: "Layers is the folder map; this is the reasoning behind it."
- **`docs/theory/module-lifecycle.md`** — the concrete add/remove procedure (manifest fields, commands) is delegated there; this page only states the measured cost of the exercise.
- **`docs/theory/reading-path.md`** — the strategic-DDD docblock convention described here (subdomain and dependency prose lives in each `module.ts` header) is the reading-path contract a reader encounters first.
- **`docs/theory/request-flow.md`** — the eager `responseSchemas` registration and the http-client wiring described in the "one arrow" section are the substrate that request-flow builds on.

## Notes

- **The single most surprising pattern**: `infrastructure` receives domain data (response schemas, locale dictionaries) pushed *down* from the composition root. Any test that exercises either subsystem without the equivalent wiring (`tests/support/unit/wire-modules.ts`) silently measures an app with no domain vocabulary and no contract validation.
- **Kernel is one file.** This is deliberate; the tier earns its place by being unambiguous, not by being large. Three files that used to sit beside `registry.ts` were relocated (to `ui/`, `app/`, and the `demo` module) after failing the "would it survive without modules?" test.
- **Strategic declarations are prose, not fields.** A module's subdomain and sibling-dependency relationships live in the docblock at the top of `module.ts`, not in the `AppModule` interface. This is a deliberate readability choice documented in `strategic-ddd.md`.
- **The live context map** (every edge labelled with relationship and reason) is maintained separately at `docs/modules/index.md` and kept in sync by hand against real imports.
