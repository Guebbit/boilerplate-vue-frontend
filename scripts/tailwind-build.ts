/**
 * @module
 * Builds Tailwind classes from `src/styles/main.css`, the way Vite would, without Vite.
 *
 * Compiles the entry stylesheet once with Tailwind v4's public `compile()` API, resolving its
 * `@import`s from the repo's `node_modules`, then turns any list of candidate class names into the
 * CSS Tailwind generates for them. A candidate Tailwind does not know produces nothing.
 * https://tailwindcss.com/docs/compatibility
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { compile } from 'tailwindcss';
import { MAIN_CSS, ROOT } from './css-sources';

/** Resolves `tailwindcss/*.css` and package imports from the repo's `node_modules`. */
const requireFromRoot = createRequire(path.join(ROOT, 'package.json'));

/**
 * Compiles `main.css` and returns a builder for candidate classes.
 *
 * @returns A function from candidate class names to the generated CSS text.
 */
export const tailwindBuilder = async (): Promise<(candidates: string[]) => string> => {
    const entry = path.join(ROOT, MAIN_CSS);
    const compiler = await compile(readFileSync(entry, 'utf8'), {
        base: path.dirname(entry),
        // `@import 'tailwindcss/utilities.css'` resolves from node_modules, like Vite would.
        loadStylesheet: (id, base) => {
            const resolved = requireFromRoot.resolve(id, { paths: [base] });
            return Promise.resolve({
                path: resolved,
                base: path.dirname(resolved),
                content: readFileSync(resolved, 'utf8')
            });
        }
    });
    return (candidates) => compiler.build(candidates);
};
