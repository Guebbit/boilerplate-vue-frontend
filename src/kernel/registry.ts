/**
 * The module registry.
 *
 * A module is a value, not a convention: everything it needs the application to do *for* it is
 * declared in one typed object, so "what does this domain touch" is answerable by reading one file
 * rather than grepping ten. `src/modules.ts` lists the enabled modules; this file is what turns
 * that list into a running application.
 *
 * Mirrors the backend registry on the idea and on the field names — `name`, `routes`, `dependsOn` —
 * while staying idiomatic here: routes are vue-router records rather than an express router, and
 * there is no `basePath` because a vue-router record carries its own path.
 *
 * The registry deliberately does not discover modules from the filesystem. An explicit list is the
 * honest answer to "what is in this build?", it stays statically typed and tree-shakeable, and
 * enabling or disabling a domain is a one-line edit rather than a folder move.
 */

import type { RouteRecordRaw } from 'vue-router';
import type { HttpHandler } from 'msw';
import type { IResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';
import type { ITranslationDictionaries } from '@/infrastructure/i18n';

/**
 * One entry a module contributes to the main navigation.
 *
 * Deliberately carries NO visibility flag. Whether a visitor may see an entry is a property of the
 * route it points at (`meta.access`), and restating it here is exactly what once let the menu and
 * the router disagree. An entry's permissions come along with its route.
 */
export interface IAppNavigationEntry {
    /** Route name to link to. Its `meta.access` decides who sees the entry. */
    name: string;

    /** i18n key for the label. */
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
}

/**
 * Which dataset the mock backend is populated with. Resolved from `VITE_MOCK_PROFILE` by
 * `resolveProfile()` in `@mocks/mockProfiles.ts`; named here because `mockSeeds` is
 * parameterised by it and the registry states that contract.
 */
export type TMockProfile = 'seed' | 'random';

/**
 * The mock database's shape: one field per domain that contributes fixtures.
 *
 * Intentionally empty here. This is the extension point — each module declares its own slice by
 * augmenting this interface from `src/modules/<name>/mocks/seeds.ts`, exactly as the backend's
 * modules augment `IAuditActionMap`:
 *
 * ```ts
 * declare module '@/kernel/registry' {
 *     interface IMockSeedData { sampleProducts: Product[]; }
 * }
 * ```
 *
 * Interface declaration merging ADDS members, so this type ends up holding precisely the fields
 * the enabled modules declare — and delete a module and its field leaves the type with it, which
 * turns every leftover `mockDatabase.sampleProducts` into a compile error rather than a silent
 * survivor. `npm run type-check-only` is the deletion test; there is no list to keep in step.
 *
 * The kernel therefore names no domain while still typing every read site exactly.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IMockSeedData {}

/** What a module's slice builder is handed. */
export interface IMockSeedContext {
    /** The active profile. A module must answer for both. */
    profile: TMockProfile;

    /**
     * The slices already built, in `after` order. This is how `orders` gets the `Product[]` whose
     * snapshots its fixtures embed, without importing the products module.
     */
    soFar: Partial<IMockSeedData>;
}

/**
 * Everything a module declares about itself.
 *
 * Keep this interface small. A field that only one module ever fills does not belong here — that
 * module should do the thing itself, behind its own barrel.
 */
export interface IAppModule {
    /** Registry identity. Must match the folder name under `src/modules/`. */
    name: string;

    /** The domain's route records, spliced into the localised route tree. */
    routes: RouteRecordRaw[];

    /**
     * Main-navigation entries this domain contributes. Optional: a module with no menu presence
     * (`account` contributes only Profile, `cart` only Cart) simply omits it.
     */
    navigation?: IAppNavigationEntry[];

    /**
     * Response-envelope schemas for the endpoints this domain calls, keyed by method + path
     * pattern. Contributed here rather than held in one shared table so that a domain's contract
     * validation arrives and leaves with its folder.
     */
    responseSchemas?: IResponseSchemaRoute[];

    /**
     * This domain's translation dictionaries, one lazy loader per locale code.
     *
     * Kept as loaders rather than imported objects so each dictionary stays its own chunk: a
     * visitor downloads one language, for the enabled domains only.
     */
    locales?: Record<string, () => Promise<ITranslationDictionaries>>;

    /**
     * Loader for this domain's MSW request handlers, or `undefined` when the build has mocking
     * off. See {@link collectModuleMockHandlers} for why it is a thunk and why each module
     * declares it behind an `import.meta.env.VITE_API_MOCK_ENABLED` check rather than a helper.
     */
    mockHandlers?: () => Promise<HttpHandler[]>;

    /**
     * This domain's slice of the mock database — the data the handlers above answer *with*.
     *
     * `after` names the modules whose slices must exist before this one can build. It is a
     * separate graph from {@link IAppModule.dependsOn} and deliberately so: `dependsOn` is about
     * code (`Cart.vue` calls `useOrdersStore`), this is about fixtures (an order embeds a product
     * snapshot). A module can need another's data without importing a line of its code, and
     * folding the two would make both fields lie about one of their halves.
     *
     * Same thunk-plus-inline-env-ternary shape as `mockHandlers`, for the same bundling reason —
     * see {@link collectModuleMockSeeds}.
     */
    mockSeeds?: {
        /** Modules whose slices must be built first. Must stay a DAG. */
        after?: string[];
        build: (context: IMockSeedContext) => Promise<Partial<IMockSeedData>>;
    };

    /**
     * Names of modules this one imports from. Declared rather than inferred, because the point is
     * to fail at startup with a sentence instead of on the first navigation with a blank screen.
     *
     * This must stay a DAG. Two modules that each need the other are not a dependency pair — they
     * are one module.
     */
    dependsOn?: string[];
}

/**
 * Reject duplicate names, unknown dependencies and dependency cycles.
 *
 * The cycle walk is a depth-first search with an explicit "in progress" set, which reports the
 * offending path rather than just the fact of a cycle.
 *
 * @param appModules - the enabled module list, in registration order
 */
export const validateModules = (appModules: IAppModule[]): void => {
    const byName = new Map<string, IAppModule>();

    // Pass 1 — index by name, rejecting a duplicate registration on the way.
    for (const appModule of appModules) {
        if (byName.has(appModule.name))
            throw new Error(`Module "${appModule.name}" is registered twice in src/modules.ts`);
        byName.set(appModule.name, appModule);
    }

    // Pass 2 — every named dependency must be enabled, checked before the walk needs it.
    for (const appModule of appModules)
        for (const dependency of appModule.dependsOn ?? [])
            if (!byName.has(dependency))
                throw new Error(
                    `Module "${appModule.name}" depends on "${dependency}", which is not enabled. ` +
                        `Add it to src/modules.ts or drop the dependency.`
                );

    // `settled` is proven acyclic; `walking` is the current path, so a hit on it IS the cycle.
    const settled = new Set<string>();
    const walking = new Set<string>();

    // Depth-first, carrying `trail` so the error can print the path rather than just assert one.
    const walk = (name: string, trail: string[]): void => {
        if (settled.has(name)) return;
        if (walking.has(name))
            throw new Error(`Module dependency cycle: ${[...trail, name].join(' → ')}.`);

        walking.add(name);
        for (const dependency of byName.get(name)?.dependsOn ?? [])
            walk(dependency, [...trail, name]);
        // Off the current path, onto the settled set: this subtree is clean.
        walking.delete(name);
        settled.add(name);
    };

    // Every module is a possible root — a disconnected pair still has to be checked.
    for (const appModule of appModules) walk(appModule.name, []);
};

/**
 * Validate the registry, then collect every enabled module's route records.
 *
 * Validation happens here rather than in the router so that a misconfigured registry fails while
 * the app is being assembled, not on the navigation that first crosses the gap.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleRoutes = (appModules: IAppModule[]): RouteRecordRaw[] => {
    validateModules(appModules);
    return appModules.flatMap((appModule) => appModule.routes);
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
export const collectModuleNavigation = (appModules: IAppModule[]): IAppNavigationEntry[] =>
    appModules.flatMap((appModule) => appModule.navigation ?? []);

/**
 * Sort navigation entries by `order`, entries without one going last.
 *
 * Kept next to the collector rather than inlined at the call site so that platform entries and
 * module entries are ranked by exactly the same rule.
 *
 * @param entries - navigation entries from any contributor
 */
export const sortNavigation = (entries: IAppNavigationEntry[]): IAppNavigationEntry[] =>
    // `toSorted` spares the caller's array; MAX_SAFE_INTEGER makes "absent sorts last" fall out.
    entries.toSorted(
        ({ order: a }, { order: b }) =>
            (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER)
    );

/**
 * Collect every enabled module's response schemas, for `registerResponseSchemas`.
 *
 * Order does not matter: every pattern is anchored at both ends, so at most one row can match a
 * given method and pathname.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleResponseSchemas = (appModules: IAppModule[]): IResponseSchemaRoute[] =>
    appModules.flatMap((appModule) => appModule.responseSchemas ?? []);

/**
 * Load the MSW handlers of every enabled module that has any.
 *
 * ── Why a thunk, and why the env check lives in each `module.ts` ──────────────────────────────
 * A manifest is imported on every page load, so a plain `mockHandlers: [...]` array would drag
 * MSW, the handler code and the whole seeded mock database into the main bundle of a production
 * build. Today none of that ships: `src/main.ts` guards its `import('@mocks/apiMock.ts')` with
 * `import.meta.env.VITE_API_MOCK_ENABLED === 'true'`, which Vite replaces with a literal so the
 * branch — and everything reachable only through it — is eliminated.
 *
 * Keeping that property is why the field is a `() => Promise<HttpHandler[]>` **and** why each
 * module writes the env ternary out in full instead of calling a shared helper. Passing the
 * loader to a helper would make the dynamic import reachable through the argument, and the
 * bundler would emit the chunk again. The repetition is load-bearing; `dist/` is the test.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleMockHandlers = (appModules: IAppModule[]): Promise<HttpHandler[]> =>
    // Parallel, not sequential; a module with no mocks stands in with an empty array.
    Promise.all(
        appModules.map((appModule) => appModule.mockHandlers?.() ?? Promise.resolve([]))
    ).then((perModule) => perModule.flat());

/**
 * Build the mock database by folding every contributing module's slice together.
 *
 * Sequential where `collectModuleMockHandlers` is parallel, and that is the whole point: a slice
 * may be DERIVED from an earlier one (an order embeds a product snapshot; a cart references a
 * product id), so each builder is handed everything built before it. `Promise.all` here would
 * hand `orders` an empty `soFar` and produce a dataset whose cross-references point nowhere.
 *
 * The order comes from each module's `mockSeeds.after`, not from `src/modules.ts` — that list is
 * alphabetical on purpose, which would run `cart` before `products`.
 *
 * @param appModules - the enabled module list
 * @param profile - which dataset to build; passed through to every slice builder
 */
export const collectModuleMockSeeds = async (
    appModules: IAppModule[],
    profile: TMockProfile
): Promise<IMockSeedData> => {
    const contributors = appModules.filter((appModule) => appModule.mockSeeds);
    const byName = new Map(contributors.map((appModule) => [appModule.name, appModule]));

    /*
     * Depth-first topological walk, same shape as `validateModules`' cycle check: `visiting`
     * catches a cycle and reports the pair, `visited` keeps each module to one build.
     *
     * An `after` naming a module that is absent is skipped rather than thrown on, because that is
     * the normal state after deleting a domain — `orders` still says it comes after `products`,
     * and with the catalogue gone there is simply nothing to wait for. A missing FIELD is what
     * should fail, and the compiler already reports that.
     */
    const ordered: IAppModule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (appModule: IAppModule): void => {
        if (visited.has(appModule.name)) return;
        if (visiting.has(appModule.name))
            throw new Error(
                `Cycle in mockSeeds.after involving "${appModule.name}" — a fixture graph must be a DAG.`
            );

        visiting.add(appModule.name);
        for (const dependency of appModule.mockSeeds?.after ?? []) {
            const earlier = byName.get(dependency);
            if (earlier) visit(earlier);
        }
        visiting.delete(appModule.name);

        visited.add(appModule.name);
        ordered.push(appModule);
    };

    for (const appModule of contributors) visit(appModule);

    let soFar: Partial<IMockSeedData> = {};
    for (const appModule of ordered) {
        const slice = await appModule.mockSeeds!.build({ profile, soFar });

        /*
         * The one gap declaration merging cannot close: the augmentation is type-only, so at
         * runtime there is no list of the fields a module PROMISED — the compiler knows them and
         * erases them. What is checkable is that a module which declares `mockSeeds` at all
         * contributed something, which catches the failure this leaves open (a module augments
         * `IMockSeedData`, returns nothing, and every read of its field is `undefined` at the
         * first handler rather than at boot).
         */
        if (Object.keys(slice).length === 0)
            throw new Error(
                `Module "${appModule.name}" declares mockSeeds but contributed no fields for the "${profile}" profile.`
            );

        soFar = { ...soFar, ...slice };
    }

    // Sound by the check above plus the augmentations: every declared field has a contributor.
    return soFar as IMockSeedData;
};

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
    appModules: IAppModule[]
): Record<string, (() => Promise<ITranslationDictionaries>)[]> => {
    const byLocale: Record<string, (() => Promise<ITranslationDictionaries>)[]> = {};

    // Invert the nesting: manifests are module-then-locale, i18n wants locale-then-module.
    for (const appModule of appModules)
        for (const [locale, load] of Object.entries(appModule.locales ?? {}))
            (byLocale[locale] ??= []).push(load);

    return byLocale;
};
