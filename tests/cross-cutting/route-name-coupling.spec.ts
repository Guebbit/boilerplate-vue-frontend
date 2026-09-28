/**
 * A route name is a dependency channel `MODULE_EDGES` cannot see (FA86).
 *
 * `eslint.config.ts`'s boundary rules stop a module `import`-ing a sibling it has no coupling
 * for — but `router.push({ name: 'OrderTarget' })` is a plain string, invisible to that check.
 * `vue-router` throws on an unresolved name, so a module naming a sibling's route without either
 * a declared `MODULE_EDGES` coupling or a `router.hasRoute` guard is one deleted module away from
 * throwing at runtime — `cart`'s empty state or `wishlist`'s own page, for a `products` this
 * build no longer ships.
 *
 * This reads SOURCE TEXT rather than a mounted app, the same reasoning as `registry.spec.ts`'s
 * dictionary sweep: the failure is a string literal, not something a compiler or a router
 * instance can check on its own. Permissive by construction — a name that happens to collide with
 * something OTHER than a route reference is excluded by intersecting against the real route-name
 * set below, and a guard is recognised by text (`hasRoute(` / `linkIfRouted(` naming the same
 * literal) rather than by fully evaluating the call.
 */
import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import { enabledModules } from '@/modules';
import { MODULE_EDGES } from '../../scripts/module-edges';
import { STATIC_PAGES, staticPageRouteName } from '@/app/utils/static-pages.ts';

/** Every route name a record tree declares, at any depth — mirrors `registry.spec.ts`'s own. */
const routeNamesOf = (routes: RouteRecordRaw[]): string[] =>
    routes.flatMap((route) => [
        ...(typeof route.name === 'string' ? [route.name] : []),
        ...routeNamesOf(route.children ?? [])
    ]);

/** The shell's own routes — named nowhere in any module's `routes.ts`. */
const SHELL_ROUTE_NAMES = [
    'Home',
    'Error',
    ...STATIC_PAGES.map((page) => staticPageRouteName(page))
];

/** module name -> the route names IT declares. */
const ownRouteNames = new Map(
    enabledModules.map((appModule) => [appModule.name, new Set(routeNamesOf(appModule.routes))])
);

/** Every route name that resolves ANYWHERE in this build — the set a literal must land in to be
 *  worth checking at all; a component's own `name: 'FooPage'` never does. */
const everyRouteName = new Set([
    ...SHELL_ROUTE_NAMES,
    ...[...ownRouteNames.values()].flatMap((names) => [...names])
]);

/**
 * The route names one module may reference without a `hasRoute` guard: its own, the shell's, and
 * whatever `MODULE_EDGES` declares it may reach — a coupling already reviewed and visible, so a
 * missing route there is a deployment choice made with the risk understood.
 *
 * @param moduleName - the reaching module.
 */
const allowedRouteNamesOf = (moduleName: string): Set<string> => {
    const reaches = MODULE_EDGES[moduleName] ?? [];
    return new Set([
        ...(ownRouteNames.get(moduleName) ?? []),
        ...SHELL_ROUTE_NAMES,
        ...reaches.flatMap((sibling) => [...(ownRouteNames.get(sibling) ?? [])])
    ]);
};

/** Every `.vue`/`.ts` file below `directory`, recursively, specs excluded. */
const listFiles = (directory: string): string[] =>
    globSync(`${directory}/**/*.{ts,vue}`).filter((file) => !file.includes('/tests/'));

/**
 * Whether `source` guards `name` before using it — a `router.hasRoute('Name')` check, or the
 * `linkIfRouted` helper that wraps one, naming the SAME literal.
 *
 * @param source - one file's full text.
 * @param name - the route name a reference in it named.
 */
const isGuarded = (source: string, name: string): boolean => {
    const quoted = `['"]${name}['"]`;
    return (
        new RegExp(String.raw`hasRoute\(\s*${quoted}`).test(source) ||
        new RegExp(String.raw`linkIfRouted\([^)]*${quoted}`).test(source)
    );
};

/**
 * Every SINGLE/DOUBLE-quoted string literal in `source` naming a REAL route, deduplicated.
 *
 * Not narrowed to `name: 'X'` — {@link linkIfRouted}'s own callers pass the name as a plain
 * positional argument, with no `name:` key anywhere in the CALLING file, so a narrower pattern
 * would go blind on exactly the guarded call sites this sweep most needs to still see. A route
 * name is distinctive PascalCase text, and {@link everyRouteName} is what keeps an unrelated
 * quoted string (a CSS class, a translation key) from ever being one — the intersection is most
 * of the safety margin; backtick-quoted text is excluded entirely, since that is this very
 * codebase's OWN convention for `code formatting` a route name inside a comment's prose, not a
 * real location.
 */
const routeNameReferencesIn = (source: string): string[] => [
    ...new Set(
        [...source.matchAll(/["']([A-Za-z]\w*)["']/g)]
            .map(([, name]) => name)
            .filter((name) => everyRouteName.has(name))
    )
];

describe('a module names only its own, the shell’s, or a MODULE_EDGES sibling’s route', () => {
    it('finds modules to check', () => {
        // A canary: an empty sweep must mean "no modules exist", not "the sweep broke".
        expect(enabledModules.length).toBeGreaterThan(0);
    });

    it('actually finds cross-module route-name references to check at all', () => {
        // A second canary, same reasoning as `module-coupling.spec.ts`'s own: this could pass
        // vacuously forever if the regex, the file listing, or the route-name set ever broke.
        let totalReferences = 0;
        for (const appModule of enabledModules) {
            const allowed = allowedRouteNamesOf(appModule.name);
            for (const file of listFiles(`src/modules/${appModule.name}`))
                totalReferences += routeNameReferencesIn(readFileSync(file, 'utf8')).filter(
                    (name) => !allowed.has(name)
                ).length;
        }

        expect(totalReferences).toBeGreaterThan(0);
    });

    it('guards every undeclared cross-module route-name reference with hasRoute', () => {
        const violations = enabledModules.flatMap((appModule) => {
            const allowed = allowedRouteNamesOf(appModule.name);

            return listFiles(`src/modules/${appModule.name}`).flatMap((file) => {
                const source = readFileSync(file, 'utf8');
                return routeNameReferencesIn(source)
                    .filter((name) => !allowed.has(name) && !isGuarded(source, name))
                    .map((name) => `${file}: names '${name}', undeclared and unguarded`);
            });
        });

        expect(violations).toEqual([]);
    });
});
