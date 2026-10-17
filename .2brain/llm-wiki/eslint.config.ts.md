---
source: eslint.config.ts
sha256: 5e5f6b03d2291a7d06bd11fb9d2b8c880bb225dd32c94db8aefc9603821ccac4
generated_at: 2026-10-16T23:56:42.938348+00:00
model: ollama:qwen3.8:27b
---

# eslint.config.ts

## Purpose

Flat ESLint configuration (TypeScript) that enforces the project's architectural rules at lint time: a strict tier ladder (i18n → infrastructure → ui → kernel → modules → app), per-module dependency boundaries via `eslint-plugin-boundaries`, and integration with Vue, Cypress, Vitest, JSDoc, and other lint plugins. Module folders are discovered from the filesystem at config-load time, so adding a domain requires no edit to this file.

## Key elements

- **`shopModuleNames`** — Derived from `MODULE_GROUPS`; the set of modules labelled `shop` (the removable demo domain).
- **`moduleFolderNames`** — Read via `readdirSync` on `src/modules/`; drives all boundary policies dynamically.
- **`assertAcyclicModuleEdges(MODULE_EDGES, moduleFolderNames)`** — Walks the full module-edge graph once at config load; throws (failing every `npm run lint`) if a cycle exists or a key references a deleted module.
- **`moduleDependencyPolicies`** — Per-module `boundaries/dependencies` rules: (1) a module may import only a sibling's `index.ts` (the "one door"), (2) a `foundation` module may not import any `shop` module.
- **`boundariesElements`** — `boundaries/elements` descriptors for `domain`, `module`, `kernel`, `ui`, `infrastructure`, `i18n`, `app`, `types`. Order is significant; `domain` precedes `module`. All use `partialMatch: false`.
- **`boundariesFiles`** — `boundaries/files` categories for individual files (`composition-root`, `registry`, `ambient`, `spec`, `infra-app-state`). No wildcards.
- **`layerDependencyPolicies`** — The tier ladder as allow/disallow rules. `default: 'disallow'` is set in the rule config; each entry here *opens* one edge. Last matching policy wins, so narrower disallows (e.g. `ui` → `infra-app-state`, `kernel` → `ui`) override broader allows stated earlier.
- **Vue/TS/Cypress/Vitest plugin wiring** — `configureVueProject`, `defineConfigWithVueTs`, `vueTsConfigs`, `pluginCypress`, `pluginVitest`, etc., plus `globalIgnores` and `comments` (eslint-comments) configs.

## Relationships

- **`scripts/module-groups.ts`** — Exports `MODULE_GROUPS`; this file reads it to compute `shopModuleNames` and to decide whether a module is `foundation` (and thus barred from importing `shop`).
- **`scripts/module-edges.ts`** — Exports `MODULE_EDGES` and `assertAcyclicModuleEdges`; this file calls the assertion at load time and uses `MODULE_EDGES` values to generate the per-module "one door" allow-lists.
- **`scripts/e2e/cypress-spec-globs.ts`** — Exports `ALL_SPEC_GLOBS`; used in this file's ignore/plugin configuration so Cypress spec files are matched by the correct glob patterns.

## Notes

- **Policy order matters.** In both `layerDependencyPolicies` and `moduleDependencyPolicies`, the *last* matching policy wins. Disallow entries must appear after the broader allow they override.
- **`partialMatch: false`** anchors every element/file pattern at the repo root. Without it, `src/ui` would also match `src/infrastructure/ui-adjacent-thing`.
- **`domain` before `module`** in `boundariesElements` is load-bearing: the first matching descriptor claims the path, so a module's `domain/` subfolder must be classified before the generic `module` pattern swallows it.
- **`MODULE_EDGES` values are backend module names.** A value with no matching FE folder (e.g. `addresses`, `audit-logs`, `invoicing`) is filtered out of the boundary policies rather than left to name a pattern nothing under `src/modules` will match.
- **`default: 'disallow'`** in the `boundaries/dependencies` rule means every edge starts refused; the policies here are the explicit exceptions. A file not matched by any `boundariesFiles` entry is unknown and may not import anything.
- **`session.ts` and `observability/**`** are classified as both `infrastructure` (by folder) and `infra-app-state` (by file rule). Both classifications apply simultaneously, which is what lets the `ui` policy allow `infrastructure` in general and then disallow these two specifically.
- Adding a new module directory under `src/modules/` is sufficient for boundary coverage; no edit to this file is needed. The same principle applies to `src/modules.ts` being the only place that names a module.
