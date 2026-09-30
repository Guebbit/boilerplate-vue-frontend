/**
 * @module
 * The module registry.
 *
 * A module is a value, not a convention: everything it needs the application to do *for* it is
 * declared in one typed object, so "what does this domain touch" is answerable by reading one file
 * rather than grepping ten. `src/modules.ts` lists the enabled modules; this file is what turns
 * that list into a running application.
 *
 * Mirrors the backend registry on the idea and on the field names — `name`, `routes` — while staying
 * idiomatic here: routes are vue-router records rather than an express router, and there is no
 * `basePath` because a vue-router record carries its own path.
 *
 * The registry deliberately does not discover modules from the filesystem. An explicit list is the
 * honest answer to "what is in this build?", it stays statically typed and tree-shakeable, and
 * enabling or disabling a domain is a one-line edit rather than a folder move.
 */

import type { Component, Ref } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';
import type { TranslationDictionaries } from '@/i18n';
import type { SlotName, Slots } from '@/kernel/slots';

/**
 * Where an entry lives in the shell's chrome.
 *
 * - `main`: inline in the app bar, the pages anyone would browse to.
 * - `account`: inside the signed-in visitor's own menu — their profile, their cart, their orders.
 * - `admin`: inside the administration dropdown.
 *
 * The mobile drawer lists every section under its own heading, so placement only decides how the
 * desktop bar folds fifteen entries into five buttons and two menus.
 */
export type AppNavigationSection = 'main' | 'account' | 'admin';

/**
 * Every section, in the order the drawer lists them.
 */
export const NAVIGATION_SECTIONS = [
    'main',
    'account',
    'admin'
] as const satisfies readonly AppNavigationSection[];

/**
 * One entry a module contributes to the main navigation.
 *
 * Deliberately carries NO visibility flag. Whether a visitor may see an entry is a property of the
 * route it points at (`meta.access`); a second copy here is a second answer, free to disagree with
 * the router's. An entry's permissions come along with its route.
 */
export interface AppNavigationEntry {
    /**
     * Route name to link to. Its `meta.access` decides who sees the entry.
     */
    name: string;

    /**
     * i18n key for the label.
     */
    label: string;

    /**
     * vue-i18n pluralization index for `label`. Some entries read naturally as one thing ("Cart")
     * and some as many ("Products"), and that is a property of the copy rather than of the route.
     */
    plural?: number;

    /**
     * Sort key across every contributor, platform included. Spaced by tens so a new entry can be
     * slotted between two existing ones without renumbering anything.
     *
     * Absent sorts last, which is the right default for a domain that has not thought about it.
     */
    order?: number;

    /**
     * A live count the entry wears — the cart's item count is the canonical case.
     *
     * An accessor rather than a number because the count is reactive state the module owns: the
     * shell calls this once inside its setup and renders whatever the ref holds, without ever
     * learning whose store it is reading. `undefined` or `0` renders no badge. Reaching a store
     * is fine here — the accessor runs inside component setup, after pinia is installed.
     */
    badge?: () => Ref<number | undefined>;

    /**
     * Which part of the chrome shows the entry. Absent means `main`.
     *
     * This is placement, not permission. An `account` entry is not hidden from guests because it
     * sits in the account menu — it is hidden because its route says `access: 'auth'`. Keeping the
     * two apart is what lets the drawer show a section heading only when something under it is
     * actually visible, without a second copy of the access rule.
     */
    section?: AppNavigationSection;

    /**
     * Also shown as its own button beside the account menu, on every width — the cart is the
     * canonical case: a shop's cart is never behind a dropdown.
     *
     * Placement again, not permission: the entry keeps its `section` (that is where the drawer
     * lists it), it is only lifted OUT of that section's menu on desktop and worn on the bar
     * instead, with its {@link badge} and {@link detail}. Only meaningful on a menu section
     * (`account`/`admin`); a `main` entry is already on the bar.
     */
    pinned?: boolean;

    /**
     * A short live text worn beside the icon of a {@link pinned} entry — the cart's formatted
     * total. Same contract as {@link badge}: an accessor the shell calls once in its setup, and a
     * ref it renders without knowing whose store it reads. `undefined` or empty renders nothing.
     */
    detail?: () => Ref<string | undefined>;

    /**
     * The glyph the entry wears, a lucide component. The desktop bar shows `main` entries as icon
     * plus label, the menus and the drawer prefix each entry with it, and a `pinned` entry is the
     * icon with its count — so every entry needs one. Required rather than optional so a missing
     * icon is a compile error where the entry is declared, instead of a `registry.spec.ts`
     * failure discovered later. Typed as a Vue component rather than a lucide type so the kernel
     * owes the icon library nothing.
     */
    icon: Component;
}

/**
 * Everything a module declares about itself.
 *
 * Keep this interface small. A field that only one module ever fills does not belong here — that
 * module should do the thing itself, behind its own barrel. A field nothing reads at runtime is a
 * comment with extra syntax: what a module depends on is its `import` statements, how it relates to
 * a sibling is prose in the docblock above the manifest, and which subdomain it sits in is context a
 * reader gets from that same prose rather than a classification nothing checks. See
 * `docs/theory/strategic-ddd.md` §2 and §4 for why those belong in prose rather than in fields.
 */
export interface AppModule {
    /**
     * Registry identity. Must match the folder name under `src/modules/`.
     */
    name: string;

    /**
     * The domain's route records, spliced into the localised route tree.
     */
    routes: RouteRecordRaw[];

    /**
     * Main-navigation entries this domain contributes. Optional: a module with no menu presence
     * (`account` contributes only Profile, `cart` only Cart) simply omits it.
     */
    navigation?: AppNavigationEntry[];

    /**
     * Components this domain contributes to slots another module owns — see `kernel/slots.ts`.
     * Contributed here, not imported by the owner, so the owning view never learns who fills it.
     */
    slots?: Slots;

    /**
     * `resourceKey` prefixes the shell's corner activity indicator answers to for this domain —
     * `'account'` matches `accountProfile`, `accountAuth`, …. Opt-in: a module that omits it never
     * lights the indicator, which is the right default for one whose requests are background noise
     * (the observability stream) rather than something the visitor asked for.
     *
     * Declared here so a new module's stores show activity without anyone editing the layout.
     */
    loadingKeys?: string[];

    /**
     * Lazy loader for the response-envelope schemas of the endpoints this domain calls, keyed by
     * method + path pattern. Contributed here rather than held in one shared table so that a
     * domain's contract validation arrives and leaves with its folder.
     *
     * A loader, not the rows themselves: each one imports its `response-schemas.ts`, which pulls
     * in `@api/schemas` — invoking it is what triggers that ~350 KB chunk to download (FA94), so
     * it stays unopened until `loadResponseSchemas` decides validation is actually running.
     */
    responseSchemas?: () => Promise<ResponseSchemaRoute[]>;

    /**
     * This domain's translation dictionaries, one lazy loader per locale code.
     *
     * Kept as loaders rather than imported objects so each dictionary stays its own chunk: a
     * visitor downloads one language, for the enabled domains only.
     */
    locales?: Record<string, () => Promise<TranslationDictionaries>>;

    /**
     * Wipes this domain's locale-sensitive cache(s) — a product title in a Pinia dictionary keyed
     * by id alone, with nothing about the key that says which language filled it in. Called by
     * the locale guard once a language switch has actually happened — never on an ordinary
     * navigation that keeps the same one. A module with no server-text cache (or one already
     * keyed/refetched per locale) simply omits it: having the callback IS the flag, so there is
     * no separate declaration to forget.
     *
     * A callback rather than a store reference: the kernel must not know Pinia exists, so a
     * module wires its own store's reset action (or several, or a partial one that spares
     * unrelated state) in here rather than exposing the store itself.
     *
     * May return a promise — a module reaching its store through a lazy `import()` (FA81) has no
     * synchronous alternative — and the locale guard awaits it before resolving the navigation, so
     * a page rendered right after a switch never reads a not-yet-wiped cache.
     */
    resetOnLocaleChange?: () => void | Promise<void>;
}

/**
 * Unwraps a locale JSON's default export, for the `locales` loaders above.
 *
 * Only the unwrap is shared. The `import()` specifier stays a literal at every call site
 * because Vite resolves it statically — a computed path would resolve to nothing and take
 * the dictionary with it.
 *
 * @param module - The resolved JSON module namespace.
 * @returns Its default export, the dictionary itself.
 */
export const dictionary = ({
    default: value
}: {
    default: TranslationDictionaries;
}): TranslationDictionaries => value;

/**
 * Strip a leading/trailing slash, so `'products'` and `'/products/'` compare equal.
 *
 * @param path - one route record's own `path`, not yet joined to its ancestors'.
 */
const normalisedSegment = (path: string): string => path.replaceAll(/^\/+|\/+$/g, '');

/**
 * Every named route's identity — its name, and its full path joined from its ancestors' — at any
 * depth. No route record in this repo nests `children` today, but a future one that does must not
 * sneak a name or a path past {@link assertUniqueRoutes} by nesting it.
 *
 * @param routes - a route record tree
 * @param parentPath - the already-normalised path of every ancestor, joined
 */
const routeIdentitiesOf = (
    routes: RouteRecordRaw[],
    parentPath = ''
): { name: string; path: string }[] =>
    routes.flatMap((route) => {
        const path = [parentPath, normalisedSegment(route.path)].filter(Boolean).join('/');
        return [
            ...(typeof route.name === 'string' ? [{ name: route.name, path }] : []),
            ...routeIdentitiesOf(route.children ?? [], path)
        ];
    });

/**
 * Refuses two routes sharing a name or a normalised path.
 *
 * vue-router keeps only the later route of a duplicate name and warns to the console rather than
 * failing — easy to miss until the earlier one's link silently stops navigating. Mirrors the
 * backend's `uniqueEntries`: a boot-time throw beats a page that renders wrong.
 *
 * @param routes - every route record this build assembles — the shell's own plus every enabled
 *  module's, so a module cannot collide with either a sibling or the shell itself.
 * @throws {Error} naming the first duplicate name or path found.
 */
export const assertUniqueRoutes = (routes: RouteRecordRaw[]): void => {
    const seenNames = new Set<string>();
    const seenPaths = new Set<string>();

    for (const { name, path } of routeIdentitiesOf(routes)) {
        if (seenNames.has(name)) throw new Error(`Two routes declare the same name: "${name}".`);
        seenNames.add(name);

        if (seenPaths.has(path)) throw new Error(`Two routes declare the same path: "${path}".`);
        seenPaths.add(path);
    }
};

/**
 * Collect every enabled module's route records.
 *
 * An unknown or cyclic module coupling, and a stray reach into a sibling's internals, fail on
 * `npm run lint` without help from this function: `no-restricted-imports` in `eslint.config.ts`
 * enforces which sibling a module may reach at all. That is the enforceable half of a module's
 * couplings, and it is enforced there rather than declared here — see
 * `docs/theory/strategic-ddd.md` §2.
 *
 * What IS enforced here is {@link assertUniqueRoutes} across every module's own routes: two
 * modules picking the same name or path is not an import a lint rule can see.
 *
 * @param appModules - the enabled module list
 * @throws {Error} when two modules declare the same route name or normalised path.
 */
export const collectModuleRoutes = (appModules: AppModule[]): RouteRecordRaw[] => {
    const routes = appModules.flatMap((appModule) => appModule.routes);
    assertUniqueRoutes(routes);
    return routes;
};

/**
 * Collect every enabled module's navigation entries, in `order`.
 *
 * Callers concatenate their own entries — the app shell owns Home and Playground, which belong to
 * no domain — and sort the whole list once, so a platform entry and a module entry can interleave.
 * That is why this returns entries rather than rendered items, and why it does not sort on its own.
 *
 * Filtering by permission is NOT done here: it needs a resolved route and a visitor, both of which
 * live in the component. See `AppNavigation.vue`.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleNavigation = (appModules: AppModule[]): AppNavigationEntry[] =>
    appModules.flatMap((appModule) => appModule.navigation ?? []);

/**
 * Sort navigation entries by `order`, entries without one going last.
 *
 * Kept next to the collector rather than inlined at the call site so that platform entries and
 * module entries are ranked by exactly the same rule.
 *
 * @param entries - navigation entries from any contributor
 */
export const sortNavigation = (entries: AppNavigationEntry[]): AppNavigationEntry[] =>
    // `toSorted` spares the caller's array; MAX_SAFE_INTEGER makes "absent sorts last" fall out.
    entries.toSorted(
        ({ order: a }, { order: b }) =>
            (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER)
    );

/**
 * Rank navigation entries by `order`, then bucket them by section.
 *
 * Every section is present in the result, empty or not, so a consumer can index it without a
 * guard. Sorting happens once, before the split, so the relative order of two entries is the
 * same whichever section they land in.
 *
 * @param entries - navigation entries from any contributor
 */
export const groupNavigation = (
    entries: AppNavigationEntry[]
): Record<AppNavigationSection, AppNavigationEntry[]> => {
    const groups: Record<AppNavigationSection, AppNavigationEntry[]> = {
        main: [],
        account: [],
        admin: []
    };
    for (const entry of sortNavigation(entries)) groups[entry.section ?? 'main'].push(entry);
    return groups;
};

/**
 * Collect every enabled module's response-schema loader, for `loadResponseSchemas`.
 *
 * Returns the loaders themselves, uninvoked — collecting them imports no schema and downloads no
 * chunk; only calling one does (see {@link AppModule.responseSchemas}). Order does not matter:
 * every pattern is anchored at both ends, so at most one row can match a given method and
 * pathname.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleResponseSchemas = (
    appModules: AppModule[]
): (() => Promise<ResponseSchemaRoute[]>)[] =>
    appModules
        .map((appModule) => appModule.responseSchemas)
        .filter((loader): loader is () => Promise<ResponseSchemaRoute[]> => loader !== undefined);

/**
 * Merge every enabled module's slot contributions, per slot, in module order.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleSlots = (appModules: AppModule[]): Slots => {
    const merged: Slots = {};
    for (const appModule of appModules)
        for (const [name, components] of Object.entries(appModule.slots ?? {}))
            // `Object.entries` widens the key to `string`; every key of a `Slots` is a `SlotName`.
            merged[name as SlotName] = [...(merged[name as SlotName] ?? []), ...components];
    return merged;
};

/**
 * Collect every enabled module's loading-indicator prefixes, flat.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleLoadingKeys = (appModules: AppModule[]): string[] =>
    appModules.flatMap((appModule) => appModule.loadingKeys ?? []);

/**
 * Collect every enabled module's locale-reset callback, for the locale guard to run after an
 * actual language switch.
 *
 * @param appModules - the enabled module list
 */
export const collectLocaleSensitiveResets = (
    appModules: AppModule[]
): (() => void | Promise<void>)[] =>
    appModules.flatMap((appModule) =>
        appModule.resetOnLocaleChange ? [appModule.resetOnLocaleChange] : []
    );

/**
 * Group every enabled module's dictionary loaders by locale code, for
 * `registerLocaleContributors`.
 *
 * A module that ships only some of the app's languages simply appears under those keys — the
 * shared dictionary still answers for the rest, and a missing key renders as itself rather than
 * breaking the page.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleLocales = (
    appModules: AppModule[]
): Record<string, (() => Promise<TranslationDictionaries>)[]> => {
    const byLocale: Record<string, (() => Promise<TranslationDictionaries>)[]> = {};

    // Invert the nesting: manifests are module-then-locale, i18n wants locale-then-module.
    for (const appModule of appModules)
        for (const [locale, load] of Object.entries(appModule.locales ?? {}))
            (byLocale[locale] ??= []).push(load);

    return byLocale;
};
