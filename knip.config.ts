import type { KnipConfig } from 'knip';

/**
 * knip: lists unused files, exports and dependencies by walking imports from the entry points.
 * https://knip.dev/reference/configuration
 *
 * Read by the `code-shape` audit, never by a gate — see `scripts/audit/code-shape/SKILL.md`.
 * This file only states what knip cannot see on its own; everything it then reports is a
 * candidate for the audit to judge, not a verdict.
 */
const config: KnipConfig = {
    // Entry points on top of the ones knip's plugins find from package.json, vite and eslint.
    entry: [
        // The module barrels are public surface, unused on purpose (`docs/theory/strategic-ddd.md` §5).
        'src/modules/*/index.ts',
        // Each module's manifest is loaded by the registry's glob, never imported by name.
        'src/modules/*/module.ts',
        // Specs and scripts run by their runners, never imported.
        'tests/**/*.{ts,cy.ts}',
        'scripts/**/*.ts',
        // Named by `package.json` scripts and VitePress's own conventional paths, which no plugin reads.
        'vitest.config.mutation.ts',
        'docs/.vitepress/config.mts',
        'docs/.vitepress/theme/index.ts',
        // Lighthouse budgets, loaded by the lighthouse runner from `src/modules/*/tests/`.
        'src/modules/*/tests/lighthouse.ts'
    ],
    // Generated client and contracts: knip reports on what we write, not on what we generate.
    ignore: ['contracts/**', 'src/**/*.generated.ts']
};

export default config;
