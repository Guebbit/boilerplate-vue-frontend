/**
 * Invariants every enabled module must satisfy, whichever modules those are.
 *
 * This is the shape a cross-cutting spec is allowed to take: it **iterates** the registry and
 * never **names** a domain. Delete `products` and this file keeps passing, testing one module
 * fewer — which is exactly what `docs/theory/modules.md` asks of a spec that lives outside a
 * module.
 *
 * The property is "every menu entry any module contributes points at a route that module
 * declares, and every route it declares is reachable" — not "products is in the menu and is
 * public". A hardcoded phrasing breaks when a domain is removed; this one does not.
 *
 * The failure it exists to catch is a silent one: a `navigation` entry naming a route that does
 * not exist renders a link that resolves to nothing. `vue-router` warns in the console and
 * carries on, so a human clicking around finds it and no gate does.
 */
import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import { enabledModules } from '@/modules';
import type { TranslationDictionaries } from '@/infrastructure/i18n';
import { NAVIGATION_SECTIONS, validateModules } from '@/kernel/registry';

/** Every route name a record tree declares, at any depth. */
const routeNamesOf = (routes: RouteRecordRaw[]): string[] =>
    routes.flatMap((route) => [
        ...(typeof route.name === 'string' ? [route.name] : []),
        ...routeNamesOf(route.children ?? [])
    ]);

const moduleCases = enabledModules.map((appModule) => [appModule.name, appModule] as const);

describe('the enabled registry', () => {
    it('is internally consistent — no duplicate name, no unknown or cyclic dependency', () => {
        expect(() => validateModules(enabledModules)).not.toThrow();
    });

    it('enables at least one module, so the sweeps below are not vacuously true', () => {
        expect(enabledModules.length).toBeGreaterThan(0);
    });

    it('declares every dependency as a module that is itself enabled', () => {
        const names = new Set(enabledModules.map(({ name }) => name));

        for (const { dependsOn = [] } of enabledModules)
            for (const edge of dependsOn) expect(names).toContain(edge.module);
    });
});

describe.each(moduleCases)('module %s', (_name, appModule) => {
    it('contributes navigation entries that point at routes it declares', () => {
        const declared = new Set(routeNamesOf(appModule.routes));

        for (const { name } of appModule.navigation ?? []) expect(declared).toContain(name);
    });

    it('gives every navigation entry an order, so it cannot silently sink to the bottom', () => {
        for (const entry of appModule.navigation ?? []) expect(entry.order).toBeTypeOf('number');
    });

    /**
     * The desktop bar renders an entry as its icon alone, with the label as tooltip and name.
     * An entry without one would render an empty button — focusable, named, and blank.
     */
    it('gives every navigation entry an icon, because the bar shows nothing else', () => {
        for (const entry of appModule.navigation ?? []) expect(entry.icon).toBeDefined();
    });

    it('places every navigation entry in a section the shell knows how to draw', () => {
        // `undefined` is a valid answer: the shell reads it as `main`.
        for (const entry of appModule.navigation ?? [])
            expect([undefined, ...NAVIGATION_SECTIONS]).toContain(entry.section);
    });

    it('names every route it declares — the navigation and the guards address routes by name', () => {
        for (const route of appModule.routes) expect(typeof route.name).toBe('string');
    });
});

/**
 * Dictionary collisions.
 *
 * Nesting every key under its module (`products.list.page-title` rather than
 * `products-list-page.page-title`) would make a collision impossible by construction, but it
 * touches every `.vue` file and every JSON, and keys already carry a domain prefix by convention.
 * This catches the same failure at roughly none of the cost.
 *
 * The failure: dictionaries are DEEP-MERGED at boot, in registration order. If two modules declare
 * the same top-level key, the later one's entries win and the earlier one's copy vanishes. Nothing
 * throws. The page renders raw keys, and only a human reading the screen in that language notices.
 *
 * `navigation` is the deliberate exception — every module contributes its own `label-*` slice of
 * it, which is exactly why the merge has to be deep. So it is checked one level lower instead:
 * co-owning the namespace is fine, claiming the same entry inside it is not.
 */
const CO_OWNED_NAMESPACE = 'navigation';

/** Locale codes any enabled module ships, deduplicated. */
const localeCodes = [
    ...new Set(enabledModules.flatMap((appModule) => Object.keys(appModule.locales ?? {})))
];

/** Every contributor's dictionary for one locale, the shared one included, labelled by owner. */
const dictionariesFor = (
    locale: string
): Promise<{ owner: string; dictionary: TranslationDictionaries }[]> =>
    Promise.all([
        (import(`@/locales/${locale}.json`) as Promise<{ default: TranslationDictionaries }>).then(
            ({ default: dictionary }) => ({ owner: '<shared>', dictionary })
        ),
        ...enabledModules
            .filter((appModule) => appModule.locales?.[locale])
            .map((appModule) =>
                appModule.locales![locale]().then((dictionary) => ({
                    owner: appModule.name,
                    dictionary
                }))
            )
    ]);

/** key → the contributors that declare it, for anything declared more than once. */
const clashesIn = (entries: { owner: string; keys: string[] }[]): Record<string, string[]> => {
    const owners: Record<string, string[]> = {};

    for (const { owner, keys } of entries) for (const key of keys) (owners[key] ??= []).push(owner);

    return Object.fromEntries(
        Object.entries(owners).filter(([, contributors]) => contributors.length > 1)
    );
};

describe.each(localeCodes)('locale dictionaries — %s', (locale) => {
    it('gives every top-level namespace exactly one owner', () =>
        dictionariesFor(locale).then((loaded) => {
            const clashes = clashesIn(
                loaded.map(({ owner, dictionary }) => ({
                    owner,
                    keys: Object.keys(dictionary).filter((key) => key !== CO_OWNED_NAMESPACE)
                }))
            );

            // Named rather than counted: the message has to say WHICH namespace and WHO, or the
            // failure is a scavenger hunt through seven JSON files.
            expect(clashes).toEqual({});
        }));

    it(`gives every ${CO_OWNED_NAMESPACE} entry exactly one owner, though the namespace is shared`, () =>
        dictionariesFor(locale).then((loaded) => {
            const clashes = clashesIn(
                loaded.map(({ owner, dictionary }) => ({
                    owner,
                    keys: Object.keys(
                        (dictionary[CO_OWNED_NAMESPACE] as TranslationDictionaries | undefined) ??
                            {}
                    )
                }))
            );

            expect(clashes).toEqual({});
        }));

    it('is shipped by every module, so no domain is untranslated in this language', () => {
        const missing = enabledModules
            .filter((appModule) => appModule.locales && !appModule.locales[locale])
            .map(({ name }) => name);

        expect(missing).toEqual([]);
    });
});
