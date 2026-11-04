/**
 * A route name is a dependency channel `MODULE_EDGES` cannot see.
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
 * Whether a file declares notices, i.e. imports `AppNotice` or `NoticeTarget` from the registry.
 *
 * @param source - one file's full text.
 */
const declaresNotices = (source: string): boolean =>
    /import\s+type\s*{[^}]*\b(?:AppNotice|NoticeTarget)\b[^}]*}\s*from\s*["']@\/kernel\/registry/.test(
        source
    );

/**
 * The text a route-name sweep reads. In a file that declares notices, `route: 'Name'` is not a
 * reference to guard: a notice target is guarded by construction (`AppNotice.target`, the inbox
 * store's `targetOf`, the bell, then `useNotificationLink` through `linkIfRouted`). Any OTHER
 * mention of the name in that file stays visible.
 *
 * @param source - one file's full text.
 */
const sweptText = (source: string): string =>
    declaresNotices(source) ? source.replaceAll(/\broute:\s*["']\w+["']/g, '') : source;

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
        [...sweptText(source).matchAll(/["']([A-Za-z]\w*)["']/g)]
            .map(([, name]) => name)
            .filter((name) => everyRouteName.has(name))
    )
];

/**
 * The route names `source` references that are not `allowed` and not guarded.
 *
 * @param source - one file's full text.
 * @param allowed - the route names the file's module may name freely.
 */
const unguardedIn = (source: string, allowed: Set<string>): string[] =>
    routeNameReferencesIn(source).filter((name) => !allowed.has(name) && !isGuarded(source, name));

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
                return unguardedIn(source, allowed).map(
                    (name) => `${file}: names '${name}', undeclared and unguarded`
                );
            });
        });

        expect(violations).toEqual([]);
    });
});

describe('a notice target is guarded by construction', () => {
    const noticeImport = "import type { NoticeTarget } from '@/kernel/registry';\n";
    const none = new Set<string>();

    it('lets a notice file name a route as its target', () => {
        expect(unguardedIn(`${noticeImport}const t = { route: 'OrderTarget' };`, none)).toEqual([]);
    });

    it('refuses `route:` in a file that declares no notices', () => {
        expect(unguardedIn("const t = { route: 'OrderTarget' };", none)).toEqual(['OrderTarget']);
    });

    it('still refuses an unguarded `name:` for the same route in a notice file', () => {
        const source = `${noticeImport}const t = { route: 'OrderTarget' };\nrouter.push({ name: 'OrderTarget' });`;

        expect(unguardedIn(source, none)).toEqual(['OrderTarget']);
    });
});
