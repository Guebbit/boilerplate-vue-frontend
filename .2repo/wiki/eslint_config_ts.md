# eslint.config.ts

## Purpose

ESLint flat-config that encodes this codebase's architecture as lint-time rules. Beyond standard syntax/style enforcement, it uses `no-restricted-imports` to mechanically enforce module boundaries, tier directionality, domain-layer purity, and a ban on double-casts — turning "don't import this" from a convention into a build-blocking error.

## Key elements

- **`MODULE_EDGES`** — Hand-maintained map of which sibling modules each domain may import (e.g. `orders → [cart, delivery, payments]`). The single source of truth for cross-module coupling; a new edge is a deliberate edit here.
- **`moduleBoundaryRules`** — Generated from `readdirSync` on `src/modules/`, so adding a domain folder requires no edit to this file. Emits two `no-restricted-imports` patterns per module: (1) no importing a sibling's internals (must use the barrel), (2) no importing siblings not listed in `MODULE_EDGES`.
- **`domainPurityRules`** — Restricts `src/modules/*/domain/**` to plain TypeScript: bans imports of `vue`, `pinia`, `axios`, `vue-router`, `vue-i18n`, all tier paths, sibling modules, and relative `../` paths.
- **`tierBoundaryRules`** — Enforces the one-directional tier order `infrastructure → ui → kernel → modules`. Each tier may import lower tiers only. Notable allowance: `ui` may use infrastructure but not session/observability modules.
- **`bannedDoubleCasts`** — AST selectors banning `as unknown as T` and `as any as T` everywhere. Must be spread into every config block that sets `no-restricted-syntax` (the rule does not merge across configs).
- **Plugin stack** — `@vue/eslint-config-typescript` (via `defineConfigWithVueTs`), `eslint-plugin-vue`, `eslint-plugin-vuejs-accessibility`, `@vitest/eslint-plugin`, `eslint-plugin-cypress`, `eslint-plugin-unicorn`, `typescript-eslint`, `@eslint-community/eslint-plugin-eslint-comments`.
- **`ALL_SPEC_GLOBS`** (imported from `scripts/cypress-spec-globs.ts`) — Supplies glob patterns for Cypress spec files, used in the final config assembly.

## Relationships

- **`scripts/cypress-spec-globs.ts`** — Imported at module top-level; provides `ALL_SPEC_GLOBS` so the Cypress plugin's `setupEnv` file list stays in one place shared with the lint config.
- **`docs/theory/strategic-ddd.md`** — Referenced in the `MODULE_EDGES` docblock (§2) as the narrative rationale for why the edge list lives here rather than in per-module manifests. No runtime dependency.
- **`src/infrastructure/utils/logger.ts`** — Falls under the `infrastructure` tier governed by `tierBoundaryRules`; it may not import `@/ui`, `@/kernel`, `@/app`, or `@/modules`. No import in this file.
- **`package.json`** — Declares the ESLint plugins and scripts this config consumes; the `eslint` script in `package.json` is the entrypoint that loads this file.

## Notes

- `moduleBoundaryRules` is **generated** from the filesystem (`readdirSync` on `src/modules`). Adding a new domain directory automatically produces a boundary block; there is nothing to add here.
- `tierBoundaryRules` is **hand-written** (four tiers, named in the architecture) — the deliberate contrast with the generated module rules is called out in the docblock.
- `no-restricted-syntax` does **not** merge across config blocks; the nearest matching block replaces the selector list entirely. This is why `bannedDoubleCasts` must be spread into every block that touches that rule rather than set once globally.
- The `MODULE_EDGES` list was extracted from a former per-module `dependsOn` manifest field. The "why" for each edge is expected to live in the dependent module's `module.ts` docblock, not here.
- The `ui` tier has a narrower restriction than the others: it *may* import from `@/infrastructure` but is explicitly barred from `session*` and `observability*` sub-paths.
