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

import type { Ref } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import type { HttpHandler } from 'msw';
import type { ResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';
import type { TranslationDictionaries } from '@/infrastructure/i18n';

/**
 * One entry a module contributes to the main navigation.
 *
 * Deliberately carries NO visibility flag. Whether a visitor may see an entry is a property of the
 * route it points at (`meta.access`), and restating it here is exactly what once let the menu and
 * the router disagree. An entry's permissions come along with its route.
 */
export interface AppNavigationEntry {
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

    /**
     * A live count the entry wears — the cart's item count is the canonical case.
     *
     * An accessor rather than a number because the count is reactive state the module owns: the
     * shell calls this once inside its setup and renders whatever the ref holds, without ever
     * learning whose store it is reading. `undefined` or `0` renders no badge. Reaching a store
     * is fine here — the accessor runs inside component setup, after pinia is installed.
     */
    badge?: () => Ref<number | undefined>;
}

/**
 * The mock database's shape: one field per domain that contributes fixtures.
 *
 * Intentionally empty here. This is the extension point — each module declares its own slice by
 * augmenting this interface from `src/modules/<name>/mocks/register.ts`, exactly as the backend's
 * modules augment `IAuditActionMap`:
 *
 * ```ts
 * declare module '@/kernel/registry' {
 *     interface MockSeedData { sampleProducts: Product[]; }
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
export interface MockSeedData {}

/** What a module's slice builder is handed. */
export interface MockSeedContext {
    /**
     * The slices already built, in `after` order. This is how a module that derives from another's
     * fixtures reaches them without importing that module.
     */
    soFar: Partial<MockSeedData>;
}

/**
 * How this module treats the one it depends on — the label on the arrow, not just the arrow.
 *
 * A bare dependency list says two domains touch. It does not say what kind of touching, and that is
 * the question that decides what a change upstream costs. The three names below are the shapes this
 * client actually has, and each maps to something visible in the import:
 *
 * - `conformist` — reads another module's store as it is, with no translation and no say in its
 *   shape. `inventory` reading `useProductsStore` to fill a receipt select.
 * - `customer-supplier` — calls a sibling's store to make something happen, and that sibling's
 *   surface is shaped by the demand. Add-to-cart, move-to-cart and reorder are all this.
 * - `published-language` — receives vocabulary rather than state: a Zod schema, a pure function, or
 *   a self-contained component that renders its own concern. The strongest edge, because neither
 *   side learns the other's store. `orders` embedding `PaymentPanel` is the clearest case.
 *
 * `shared-kernel` is deliberately absent, and its absence is a real finding rather than an
 * omission. On the backend `account → users` is one, because both write the same User record; here
 * the same pair is `published-language`, because the client shares only the validation vocabulary
 * and the server remains the single writer. That divergence is what
 * [Domain layer](../../docs/theory/domain-layer.md) means by the domain living behind the API.
 */
export type ContextRelationship = 'conformist' | 'customer-supplier' | 'published-language';

/** One edge of the context map: who is depended on, how, and why that shape. */
export interface ContextEdge {
    /** The sibling module's registry name. */
    module: string;

    /** What kind of relationship this is. See {@link ContextRelationship}. */
    as: ContextRelationship;

    /**
     * One sentence, present tense, naming what is actually reached across the edge.
     *
     * Required rather than optional on purpose: an edge whose reason cannot be written in a line is
     * usually two edges, or a module boundary in the wrong place.
     */
    because: string;
}

/**
 * Where this module sits in the business, in the strategic-DDD sense.
 *
 * Mirrored from the backend manifest, and read with one caveat that is specific to a client: **this
 * application owns almost none of the domain it displays**. Prices, totals, eligibility and
 * permissions are decided server-side, so a `core` label here marks where the screens and the
 * client-side rules are load-bearing, not where the business logic lives.
 *
 * - `core` — the reason the product exists. Worth its own client-side rules.
 * - `supporting` — specific to this business but not a differentiator. Keep it plain.
 * - `generic` — a solved problem. Modelling effort here is waste, which is why
 *   `tests/cross-cutting/subdomainDiscipline.spec.ts` refuses a `domain/` folder inside one.
 */
export type Subdomain = 'core' | 'supporting' | 'generic';

/**
 * Everything a module declares about itself.
 *
 * Keep this interface small. A field that only one module ever fills does not belong here — that
 * module should do the thing itself, behind its own barrel.
 *
 * `subdomain` and `language` are read by nothing at runtime, which looks like it breaks that rule.
 * It does not: the manifest is where a module says what it *is* to the rest of the application, and
 * its place in the business and the words it uses are statements of exactly that kind. Kept
 * anywhere else they would be a second description, free to drift from the first.
 */
export interface AppModule {
    /** Registry identity. Must match the folder name under `src/modules/`. */
    name: string;

    /**
     * Which of the three kinds of subdomain this is. Required, because the interesting answer is
     * the one nobody wants to write down: most modules are not core, and a field that can be
     * omitted collects only the flattering half of the truth.
     */
    subdomain: Subdomain;

    /**
     * This module's ubiquitous language: the terms it uses, defined as it means them.
     *
     * Kept here rather than in a shared glossary because the same word legitimately means different
     * things in two contexts — that divergence *is* the bounded-context pattern, and a single list
     * flattens it. Worth writing on a client precisely because the words often differ from the
     * server's: a `Cart` here is a view of a cart, and saying so is the point.
     */
    language: Readonly<Record<string, string>>;

    /** The domain's route records, spliced into the localised route tree. */
    routes: RouteRecordRaw[];

    /**
     * Main-navigation entries this domain contributes. Optional: a module with no menu presence
     * (`account` contributes only Profile, `cart` only Cart) simply omits it.
     */
    navigation?: AppNavigationEntry[];

    /**
     * Response-envelope schemas for the endpoints this domain calls, keyed by method + path
     * pattern. Contributed here rather than held in one shared table so that a domain's contract
     * validation arrives and leaves with its folder.
     */
    responseSchemas?: ResponseSchemaRoute[];

    /**
     * This domain's translation dictionaries, one lazy loader per locale code.
     *
     * Kept as loaders rather than imported objects so each dictionary stays its own chunk: a
     * visitor downloads one language, for the enabled domains only.
     */
    locales?: Record<string, () => Promise<TranslationDictionaries>>;

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
     * separate graph from {@link AppModule.dependsOn} and deliberately so: `dependsOn` is about
     * code (`Order.vue` calls `useCartStore` to reorder), this is about fixtures (an order embeds a
     * product snapshot). A module can need another's data without importing a line of its code, and
     * folding the two would make both fields lie about one of their halves.
     *
     * Same thunk-plus-inline-env-ternary shape as `mockHandlers`, for the same bundling reason —
     * see {@link collectModuleMockSeeds}.
     */
    mockSeeds?: {
        /** Modules whose slices must be built first. Must stay a DAG. */
        after?: string[];
        build: (context: MockSeedContext) => Promise<Partial<MockSeedData>>;
    };

    /**
     * Modules this one imports from, each with the shape of the relationship. Declared rather than
     * inferred, because the point is to fail at startup with a sentence instead of on the first
     * navigation with a blank screen — and, since the edges are typed, to make "what does a change
     * to products cost" answerable by reading one field.
     *
     * This must stay a DAG. Two modules that each need the other are not a dependency pair — they
     * are one module.
     */
    dependsOn?: readonly ContextEdge[];
}

/**
 * Reject duplicate names, unknown dependencies and dependency cycles.
 *
 * The cycle walk is a depth-first search with an explicit "in progress" set, which reports the
 * offending path rather than just the fact of a cycle.
 *
 * @param appModules - the enabled module list, in registration order
 */
export const validateModules = (appModules: AppModule[]): void => {
    const byName = new Map<string, AppModule>();

    // Pass 1 — index by name, rejecting a duplicate registration on the way.
    for (const appModule of appModules) {
        if (byName.has(appModule.name))
            throw new Error(`Module "${appModule.name}" is registered twice in src/modules.ts`);
        byName.set(appModule.name, appModule);
    }

    // Pass 2 — every named dependency must be enabled, checked before the walk needs it.
    for (const appModule of appModules)
        for (const edge of appModule.dependsOn ?? []) {
            if (!byName.has(edge.module))
                throw new Error(
                    `Module "${appModule.name}" depends on "${edge.module}", which is not enabled. ` +
                        `Add it to src/modules.ts or drop the dependency.`
                );
            // A module that depends on itself is a typo, and the cycle walk below would report it
            // as a one-hop loop rather than as the mistake it is.
            if (edge.module === appModule.name)
                throw new Error(`Module "${appModule.name}" declares a dependency on itself.`);
        }

    // `settled` is proven acyclic; `walking` is the current path, so a hit on it IS the cycle.
    const settled = new Set<string>();
    const walking = new Set<string>();

    // Depth-first, carrying `trail` so the error can print the path rather than just assert one.
    const walk = (name: string, trail: string[]): void => {
        if (settled.has(name)) return;
        if (walking.has(name))
            throw new Error(`Module dependency cycle: ${[...trail, name].join(' → ')}.`);

        walking.add(name);
        for (const edge of byName.get(name)?.dependsOn ?? []) walk(edge.module, [...trail, name]);
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
export const collectModuleRoutes = (appModules: AppModule[]): RouteRecordRaw[] => {
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
 * Collect every enabled module's response schemas, for `registerResponseSchemas`.
 *
 * Order does not matter: every pattern is anchored at both ends, so at most one row can match a
 * given method and pathname.
 *
 * @param appModules - the enabled module list
 */
export const collectModuleResponseSchemas = (appModules: AppModule[]): ResponseSchemaRoute[] =>
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
export const collectModuleMockHandlers = (appModules: AppModule[]): Promise<HttpHandler[]> =>
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
 */
export const collectModuleMockSeeds = async (appModules: AppModule[]): Promise<MockSeedData> => {
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
    const ordered: AppModule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (appModule: AppModule): void => {
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

    let soFar: Partial<MockSeedData> = {};
    for (const appModule of ordered) {
        const slice = await appModule.mockSeeds!.build({ soFar });

        /*
         * The one gap declaration merging cannot close: the augmentation is type-only, so at
         * runtime there is no list of the fields a module PROMISED — the compiler knows them and
         * erases them. What is checkable is that a module which declares `mockSeeds` at all
         * contributed something, which catches the failure this leaves open (a module augments
         * `MockSeedData`, returns nothing, and every read of its field is `undefined` at the
         * first handler rather than at boot).
         */
        if (Object.keys(slice).length === 0)
            throw new Error(
                `Module "${appModule.name}" declares mockSeeds but contributed no fields.`
            );

        soFar = { ...soFar, ...slice };
    }

    // Sound by the check above plus the augmentations: every declared field has a contributor.
    return soFar as MockSeedData;
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
    appModules: AppModule[]
): Record<string, (() => Promise<TranslationDictionaries>)[]> => {
    const byLocale: Record<string, (() => Promise<TranslationDictionaries>)[]> = {};

    // Invert the nesting: manifests are module-then-locale, i18n wants locale-then-module.
    for (const appModule of appModules)
        for (const [locale, load] of Object.entries(appModule.locales ?? {}))
            (byLocale[locale] ??= []).push(load);

    return byLocale;
};
