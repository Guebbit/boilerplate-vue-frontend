---
source: eslint.config.ts
sha256: 1fb979baaeb0a237d5d360ce46b89d54b31df9a00271dd3c267aeb3b828bec0b
signature: 41a69e629e3083e50bb7524a4b83f7812552096e93ddb9030b421cbe868f0a52
generated_at: 2026-11-10T02:16:30.742595+00:00
model: ollama:qwen3.8:27b
---

# eslint.config.ts

## Purpose

The flat ESLint configuration for the repository. It wires together all lint plugins (Vue, TypeScript, Cypress, Vitest, JSDoc, Unicorn, boundaries, etc.), defines the architectural tier ladder and module-boundary policies enforced at lint time, and integrates project-specific rule sets, design-policy checks, and the module-manifest dependency graph. It is the single entry point that `eslint` reads via the flat-config format.

## Key elements

- **`localPlugin`** — Wraps the rules exported by `scripts/eslint/index.ts` into a single plugin object so that every config block referencing the `local/*` namespace shares one object (flat-config forbids two objects under the same plugin key).
- **`shopModuleNames`** — Pre-computed list of every module whose `module.yaml` labels it `shop` (the removable pet-supply demo domain).
- **`assertAcyclicModuleEdges(moduleDependsOn)`** — Called at module scope; throws and fails `npm run lint` if the inter-module dependency graph contains a cycle.
- **`moduleDependencyPolicies`** — An array of `eslint-plugin-boundaries` policies, one or two per module folder: (1) a module may import only a listed sibling's `index.ts` barrel (plus `tests/**` for spec files), and (2) `foundation`-group modules are explicitly disallowed from reaching any `shop` module.
- **`boundariesElements`** — Ordered tier descriptors (`domain`, `module`, `kernel`, `ui`, `infrastructure`, `i18n`, `app`, `types`) with `capture` and `partialMatch: false` so the first match wins and patterns are root-anchored.
- **`boundariesFiles`** — Individual-file classifications (`composition-root`, `registry`, `ambient`, `spec`, `infra-app-state`) for files that don't fit a folder-level element.
- **`layerDependencyPolicies`** — The tier-ladder `boundaries/dependencies` rules (bottom-up: `i18n → infrastructure → ui → kernel → modules(+domain) → app`). Uses `default: 'disallow'` with explicit allows; later, narrower policies override earlier broader ones.
- **`DESIGN_POLICY` / `designLintConfig`** — Imported from `scripts/design-policy.ts` and `scripts/eslint/design-config.ts`; integrated into the final config array to enforce design-system lint rules.
- **`ALL_SPEC_GLOBS`** — Imported from `scripts/e2e/cypress-spec-globs.ts`; used to scope Cypress-specific rules to the correct file patterns.

## Relationships

- **`scripts/module-manifest.ts`** — Primary data source. Provides `moduleFolderNames`, `moduleGroups`, `moduleDependsOn`, and `assertAcyclicModuleEdges`. The boundary policies in this file are generated directly from these exports; adding a module to `src/modules/` changes lint behavior without editing this file.
- **`scripts/eslint/index.ts`** — Exports `localRules`, the project's custom rule definitions, consumed here as `localPlugin`.
- **`scripts/eslint/design-config.ts`** — Exports `designLintConfig`, a ready-made config block for design-system enforcement, merged into the final config.
- **`scripts/design-policy.ts`** — Exports `DESIGN_POLICY`, referenced by the design lint rules.
- **`scripts/e2e/cypress-spec-globs.ts`** — Exports `ALL_SPEC_GLOBS`, used to restrict Cypress plugin rules to E2E spec files only.

## Notes

- **Order is load-bearing in two places.** In `boundariesElements`, `domain` must precede `module` (first match wins). In `layerDependencyPolicies`, a later `disallow` overrides an earlier `allow` for the same edge (e.g., `ui`'s general infrastructure allow is narrowed by the subsequent `infra-app-state` disallow).
- **`partialMatch: false`** on every element pattern prevents a shorter suffix (e.g. `src/ui`) from matching a longer unrelated path (e.g. `src/infrastructure/ui-adjacent`).
- **Dual classification is intentional.** `src/infrastructure/session.ts` and `src/infrastructure/observability/**` match both the `infrastructure` element (by folder) and the `infra-app-state` file category. Policies can allow the element then disallow the file.
- **Backend-only `dependsOn` values** (e.g. `addresses`, `audit-logs`) are filtered out before building boundary policies because no corresponding frontend folder exists under `src/modules/`; leaving them would create an element pattern nothing can match.
- **`boundariesFiles` uses no wildcards for new-file safety.** The rule `boundaries/no-unknown-files` requires every file to be explicitly classified before it may import; a wildcard here would silently admit future files.
- The file is truncated in this snapshot; the final `defineConfigWithVueTs(...)` array assembly (combining `eslint.configs`, Vue, TS, and all the above) is expected to follow.
