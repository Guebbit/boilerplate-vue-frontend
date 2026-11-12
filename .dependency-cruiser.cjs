/*
 * The graph rule — `npm run check`.
 *
 * One rule, on purpose: no cycles. ESLint sees one file's own imports and nothing further, so a
 * cycle (A -> B -> A) passes every per-file rule and fails only in whichever order the module
 * system initialises it — as an `undefined` export at boot, far from either file. The tier walls
 * stay in `eslint.config.ts` (`eslint-plugin-boundaries`): a wall belongs where it reports in the
 * editor, and two tools enforcing one property drift apart.
 *
 * Mirrors the paired backend's `.dependency-cruiser.cjs` `no-circular` rule; the rest of that file
 * is the backend's own layer rules and has no counterpart here.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            comment:
                'A cycle resolves to whatever the module system initialises first, so the symptom is an undefined export at boot rather than an error at either file. Break it by moving the shared piece up to the composition root (src/main.ts) or down a tier.',
            severity: 'error',
            from: {},
            // `circular: true` over the RUNTIME graph only — see `options` below.
            to: { circular: true }
        }
    ],
    options: {
        // Reads the aliases (`@/`, `@api`) from the app project, or every one is unresolvable and
        // the graph is a set of disconnected files.
        tsConfig: { fileName: 'tsconfig.app.json' },

        /*
         * The RUNTIME graph: `tsPreCompilationDeps` stays off. Turned on, the graph carries
         * `import type` edges, which TypeScript erases; a cycle closed by one cannot misorder
         * anything at boot and cannot be fixed except by deleting a type import doing its job.
         */

        // `node_modules` is recorded but not cruised into: the rule needs the edge, not the
        // package's own files.
        doNotFollow: { path: 'node_modules' },

        // Anchored to the repo root; generated or built output is not source.
        exclude: { path: String.raw`^(dist|dist-e2e|reports|docs/\.vitepress)/` },

        reporterOptions: { text: { highlightFocused: true } }
    }
};
