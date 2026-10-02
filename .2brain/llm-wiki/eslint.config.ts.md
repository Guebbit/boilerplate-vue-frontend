---
source: eslint.config.ts
sha256: 45b8f2acd649402ab5750764ed7ee1a0fe4ca12d2c4124d5b9856f49e5d4d4a0
generated_at: 2026-10-02T11:23:38.757431+00:00
model: ollama:qwen3.8:27b
---

# eslint.config.ts

## Purpose

Flat ESLint configuration for a Vue + TypeScript monorepo. Beyond standard lint rules, it encodes the entire architectural layer system and module-boundary contract as `eslint-plugin-boundaries` policies, so that a forbidden import, a cycle in the module graph, or a `foundation → shop` dependency fails at `npm run lint` time rather than in review.

## Key elements

- **`shopModuleNames`** — one-time list of modules labelled `shop` in `MODULE_GROUPS`; used in the foundation→shop disallow policy.
- **`moduleFolderNames`** — directory listing of `src/modules/*` read at config-load time; the source of truth for which modules exist (no hardcoded list).
- **`assertAcyclicModuleEdges(MODULE_EDGES, moduleFolderNames)`** — called once at config evaluation; throws (failing every lint run) if the edge graph is cyclic or references a module folder that no longer exists.
- **`moduleDependencyPolicies`** — per-module `boundaries/dependencies` entries enforcing (a) the "one door" rule: a sibling is only reachable via its `index.ts`, and (b) the foundation→shop prohibition.
- **`boundariesElements`** — tier descriptors (`domain`, `module`, `kernel`, `ui`, `infrastructure`, `i18n`, `app`, `types`) with `capture` patterns and `partialMatch: false`. Order matters: first match wins, so `domain` precedes `module`.
- **`boundariesFiles`** — explicit per-file classifications (composition-root, registry, ambient, spec, infra-app-state). No wildcards for new files; `session.ts` and `observability/**` carry an `infra-app-state` category that `ui`'s policy later disallows.
- **`layerDependencyPolicies`** — the tier ladder as a sequence of allow/disallow entries. `default: 'disallow'` means every edge is refused unless a policy opens it; the **last** matching policy wins, so narrower carve-outs (e.g. `ui` disallowing `infra-app-state`) override earlier broader allows.

## Relationships

- **`scripts/module-edges.ts`** — provides `MODULE_EDGES` (per-module allowed sibling list, backend-named values filtered to existing FE folders) and `assertAcyclicModuleEdges` (whole-graph cycle check run at config load).
- **`scripts/module-groups.ts`** — provides `MODULE_GROUPS` (maps each module to `foundation` | `shop`); the config derives `shopModuleNames` and per-module `isFoundation` from it.
- **`scripts/e2e/cypress-spec-globs.ts`** — exports `ALL_SPEC_GLOBS`, imported here to include Cypress spec files in lint scope/ignore configuration.

## Notes

- `boundariesElements` order is **significant**: `domain` must precede `module` because the first pattern to match a path claims it.
- `partialMatch: false` on every element pattern anchors the match at the repo root, preventing e.g. `src/ui` from also matching `src/infrastructure/ui-adjacent-thing`.
- `boundariesFiles` deliberately avoids wildcards for new files so that `boundaries/no-unknown-files` forces classification of any new file before it can import anything.
- The tier ladder (bottom→top): `i18n → infrastructure → ui → kernel → modules(+domain) → app`. `app` is terminal: nothing may import it. `types` is reachable from every tier (erased at compile time).
- `MODULE_EDGES` values that name backend-only modules (e.g. `addresses`, `invoicing`) are filtered out of `moduleDependencyPolicies` because no matching FE folder exists.
- Adding a new module directory under `src/modules/` requires **no edit to this file**; the filesystem read and the per-module policy generation pick it up automatically.
