/**
 * Every module that serves a route also sweeps it for accessibility.
 *
 * The sweeps live in the modules that own the routes, so a deleted domain takes its accessibility
 * coverage with it instead of leaving a central list naming routes that 404. The cost of that
 * arrangement is that there is no single place showing what is covered — and this spec is what
 * pays it: an assertion that fails, rather than a list a person has to read. A new domain with a
 * page and no sweep cannot be merged.
 *
 * ── Why this is a structural check and not an axe run ────────────────────────────────────────
 * It reads the filesystem. Actually auditing the pages is Cypress' job and costs a browser; what
 * cannot be seen from inside Cypress is a module whose spec was never written, because a spec that
 * does not exist runs no assertions and reports nothing. That absence is what this catches.
 *
 * Modules with no `routes.ts` are exempt, and that is the point of the rule rather than a hole in
 * it: `delivery` and `payments` serve no page of their own — they are reached through the cart and
 * the order flow — so there is nothing for axe to visit.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MODULES_ROOT = path.resolve(process.cwd(), 'src/modules');

/** Every module directory, by name. */
const modules = readdirSync(MODULES_ROOT).filter((name) =>
    existsSync(path.join(MODULES_ROOT, name, 'module.ts'))
);

/** The modules that serve at least one page, and therefore have something to audit. */
const routedModules = modules.filter((name) =>
    existsSync(path.join(MODULES_ROOT, name, 'routes.ts'))
);

describe('accessibility coverage', () => {
    it('is not vacuous — some modules serve routes', () => {
        // Guards the assertion below against a refactor that moves routes elsewhere and leaves
        // this file passing over an empty set.
        expect(routedModules.length).toBeGreaterThan(0);
    });

    it('gives every routed module its own a11y sweep', () => {
        const missing = routedModules.filter(
            (name) => !existsSync(path.join(MODULES_ROOT, name, 'tests/e2e/a11y.cy.ts'))
        );

        // Named rather than counted: the failure message is the list of domains serving pages
        // nobody audits, which is the thing someone has to act on.
        expect(missing).toEqual([]);
    });

    it('leaves no a11y sweep behind a module that stopped serving routes', () => {
        const orphaned = modules.filter(
            (name) =>
                !existsSync(path.join(MODULES_ROOT, name, 'routes.ts')) &&
                existsSync(path.join(MODULES_ROOT, name, 'tests/e2e/a11y.cy.ts'))
        );

        expect(orphaned).toEqual([]);
    });
});
