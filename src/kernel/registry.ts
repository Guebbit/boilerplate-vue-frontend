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
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';
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
 * `subdomain` is read by nothing at runtime, which looks like it breaks that rule. It does not: a
 * test acts on it — a `generic` module may carry no `domain/` folder. A field nothing reads and
 * nothing checks is a comment with extra syntax; the module's vocabulary was one, and now lives in
 * `docs/theory/glossary.md`.
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
