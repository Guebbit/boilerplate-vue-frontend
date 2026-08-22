/**
 * Every route the app serves is swept for accessibility — checked route by route.
 *
 * The sweeps live in the modules that own the routes, so a deleted domain takes its accessibility
 * coverage with it instead of leaving a central list naming routes that 404. The cost of that
 * arrangement is that there is no single place showing what is covered — and this spec is what
 * pays it: an assertion that fails, rather than a list a person has to read. A new page with no
 * sweep cannot be merged.
 *
 * ── Why route by route, and not file by file ─────────────────────────────────────────────────
 * The first version of this guard asked only whether a routed module HAD an `a11y.cy.ts`. That
 * let `products/:id` and `products/:id/edit` go unaudited for months behind a sweep that visited
 * the list and the create form: a file existed, so the guard was satisfied. What it asks now is
 * whether every `path` in a module's `routes.ts` is matched by some path its sweep visits, with
 * route params (`:id`, `:tag`, an optional `:message?`) matched against whatever the sweep put
 * there. The shell's own routes in `src/app/router/index.ts` get the same treatment against
 * `tests/e2e/specs/a11y.cy.ts`.
 *
 * ── Why this is a structural check and not an axe run ────────────────────────────────────────
 * It reads source files. Actually auditing the pages is Cypress' job and costs a browser; what
 * cannot be seen from inside Cypress is a route whose sweep was never written, because a spec
 * that does not exist runs no assertions and reports nothing. That absence is what this catches.
 *
 * Modules with no `routes.ts` are exempt, and that is the point of the rule rather than a hole in
 * it: `delivery` and `payments` serve no page of their own — they are reached through the cart and
 * the order flow — so there is nothing for axe to visit.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MODULES_ROOT = path.resolve(ROOT, 'src/modules');
const SHELL_ROUTER = path.resolve(ROOT, 'src/app/router/index.ts');
const SHELL_SWEEP = path.resolve(ROOT, 'tests/e2e/specs/a11y.cy.ts');

/**
 * Routes no sweep can or should visit. Each one is a redirect or a container, never a page:
 * axe would audit whatever the redirect landed on, which is already swept under its own name.
 *
 * Spelled exactly as the `path:` in the route file. Adding to this list is a decision to leave a
 * route unaudited, which is why the reason for each sits beside it.
 */
const EXEMPT = new Set<string>([
    // account: logs out in `beforeRouteEnter` and returns Home — renders nothing of its own.
    'logout',
    // shell: the bare origin, redirected to the default locale's Home.
    '/',
    // shell: the locale container — a RouterView with no view; its children are the pages.
    '/:locale',
    // shell: the two catch-alls are redirects onto the Error route, which IS swept (as "404"
    // through a bad URL, and as an explicit status through its own path).
    ':catchAll(.*)',
    '/:catchAll(.*)'
]);

/** Every `path: '...'` literal in a route file, in order. */
const routePathsIn = (source: string): string[] => {
    const paths = [...source.matchAll(/^\s*path:\s*'([^']*)'/gm)].map(([, route]) => route);
    /*
     * The shell's prose pages are declared by mapping over a list rather than as four literals —
     * `(['about', 'faq', ...] as const).map((page) => ({ path: page, ... }))` — so the regex
     * above sees `path: page` and no string. Read the list instead; a new page added there is a
     * new route to sweep.
     */
    const mapped = /\(\[((?:'[\w-]+',?\s*)+)] as const\)\.map\(\(page\)/.exec(source);
    if (mapped) paths.push(...[...mapped[1].matchAll(/'([\w-]+)'/g)].map(([, page]) => page));
    return paths;
};

/**
 * Every locale-prefixed path a sweep visits, with the prefix and any query string removed —
 * so `/en/users/create` and `/it/locales/it?x=1` become `users/create` and `locales/it`.
 */
const sweptPathsIn = (source: string): string[] =>
    [...source.matchAll(/["'`]\/(?:en|it)(?:\/([^\s"#'?`]*))?(?:[#?][^"'`]*)?["'`]/g)].map(
        ([, rest]) => rest ?? ''
    );

/**
 * A vue-router path as a regular expression over a swept path: `:id` matches one segment, a
 * trailing `?` makes the segment optional, and a `(.*)` custom pattern matches anything.
 *
 * @param route - the `path:` as the route file spells it, leading slash or not
 * @returns A test for whether a swept path reaches this route
 */
const routeMatcher = (route: string): RegExp => {
    const segments = route.replace(/^\//, '').split('/').filter(Boolean);
    const pattern = segments
        .map((segment) => {
            if (!segment.startsWith(':'))
                return '/' + segment.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
            if (segment.includes('(.*)')) return '(?:/.*)?';
            return segment.endsWith('?') ? '(?:/[^/]+)?' : '/[^/]+';
        })
        .join('');
    // Leading slash on both sides so an empty route (Home) and an empty swept path agree: the
    // sweep's `/en` is Home, and Home's `path: ''` is a bare slash once joined.
    return new RegExp(`^${pattern || '/'}$`);
};

const readSource = (file: string) => (existsSync(file) ? readFileSync(file, 'utf8') : '');

/** One place that declares routes, and the sweep that should cover them. */
interface RoutedUnit {
    name: string;
    routes: string[];
    swept: string[];
    hasSweep: boolean;
}

/** Every module directory, by name. */
const modules = readdirSync(MODULES_ROOT).filter((name) =>
    existsSync(path.join(MODULES_ROOT, name, 'module.ts'))
);

const moduleUnit = (name: string): RoutedUnit => {
    const sweepFile = path.join(MODULES_ROOT, name, 'tests/e2e/a11y.cy.ts');
    return {
        name,
        routes: routePathsIn(readSource(path.join(MODULES_ROOT, name, 'routes.ts'))),
        swept: sweptPathsIn(readSource(sweepFile)),
        hasSweep: existsSync(sweepFile)
    };
};

/** The modules that serve at least one page, and therefore have something to audit. */
const routedModules = modules
    .filter((name) => existsSync(path.join(MODULES_ROOT, name, 'routes.ts')))
    .map((name) => moduleUnit(name));

const shell: RoutedUnit = {
    name: 'shell (src/app/router/index.ts)',
    routes: routePathsIn(readSource(SHELL_ROUTER)),
    swept: sweptPathsIn(readSource(SHELL_SWEEP)),
    hasSweep: existsSync(SHELL_SWEEP)
};

/** `unit → [route, ...]` for every route no swept path reaches, exemptions aside. */
const unsweptRoutes = ({ name, routes, swept }: RoutedUnit) =>
    routes
        .filter((route) => !EXEMPT.has(route))
        .filter((route) => {
            const matches = routeMatcher(route);
            return !swept.some((visited) => matches.test('/' + visited));
        })
        .map((route) => `${name}: ${route}`);

describe('accessibility coverage', () => {
    it('is not vacuous — some modules serve routes, and the parser sees them', () => {
        // Guards the assertions below against a refactor that moves routes elsewhere, or
        // respells them in a way the regex no longer reads, and leaves this file passing over
        // an empty set.
        expect(routedModules.length).toBeGreaterThan(0);
        expect(routedModules.flatMap(({ routes }) => routes).length).toBeGreaterThan(0);
        expect(shell.routes).toContain('error/:status/:message?');
        expect(shell.routes).toContain('about');
    });

    it('gives every routed module its own a11y sweep', () => {
        const missing = routedModules.filter(({ hasSweep }) => !hasSweep).map(({ name }) => name);

        // Named rather than counted: the failure message is the list of domains serving pages
        // nobody audits, which is the thing someone has to act on.
        expect(missing).toEqual([]);
    });

    it('sweeps every route a module declares', () => {
        // Each line names the module and the `path:` to add to its sweep — or to EXEMPT, with
        // a reason, if it genuinely renders nothing.
        expect(routedModules.flatMap((unit) => unsweptRoutes(unit))).toEqual([]);
    });

    it("sweeps every route the shell declares in the app's own router", () => {
        expect(unsweptRoutes(shell)).toEqual([]);
    });

    it('names no swept path that no route serves', () => {
        // The other direction: a sweep visiting a path that was renamed or deleted audits a
        // 404 page under the old name, and passes. The shell is left out because its catch-all
        // makes every path a served one — which is the point of its "404" case.
        const dead = routedModules.flatMap(({ name, routes, swept }) => {
            const matchers = routes.map((route) => routeMatcher(route));
            return swept
                .filter((visited) => !matchers.some((matches) => matches.test('/' + visited)))
                .map((visited) => `${name}: /en/${visited}`);
        });

        expect(dead).toEqual([]);
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
