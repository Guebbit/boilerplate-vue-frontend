/**
 * Everything a module page states about its module, gathered from the running code.
 *
 * Nothing here is transcribed by hand: the manifest, the route records, the Pinia store and the
 * response-schema rows already hold these facts, and a second copy in prose is a copy that goes
 * quietly wrong.
 *
 * Loaded through Vite rather than plain `tsx`, because a manifest here imports `.vue` components,
 * path aliases and a Pinia store. `ssrLoadModule` is the same resolution the application itself
 * gets, so what this reads is what the app runs.
 *
 * See: docs/theory/modules.md
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { shapeOf } from './shapes';

/** Absolute path of `src/modules`. */
export const MODULES_DIR = path.resolve(import.meta.dirname, '../../src/modules');

/** One screen this domain routes to. */
export interface RouteFact {
    /** Path as declared, relative to the localised root. */
    path: string;
    name: string;
    /** `meta.access` — absent means the route is open to everyone. */
    access: string;
    /** The `.vue` file the record points at, module-relative where it belongs to this module. */
    view: string;
    /** Nesting depth, for a child record. */
    depth: number;
}

/** One entry this domain contributes to the main navigation. */
export interface NavigationFact {
    routeName: string;
    label: string;
    /** Where the shell places it: `main` (the bar), `account` or `admin` (a menu). */
    section: string;
    order?: number;
    icon: boolean;
    badge: boolean;
}

/** One endpoint this domain calls, and the envelope its answer is validated against. */
export interface ApiCallFact {
    method: string;
    /** The route pattern, as the regex source with its anchors and escapes removed. */
    pattern: string;
    schema: string;
}

/** The Pinia store this domain owns, if it owns one. */
export interface StoreFact {
    id: string;
    state: string[];
    getters: string[];
    actions: string[];
}

/** One file inside the module folder, and what its shape is. */
export interface FileFact {
    path: string;
    what: string;
    reads?: string;
    /** True when no entry in the shape catalogue matched — the file-coverage check fails on these. */
    unknown: boolean;
}

/**
 * A manifest, read structurally.
 *
 * Declared here rather than imported from `@/kernel/registry`, because a manifest arrives through
 * Vite's SSR loader as a plain object: the type is a description of what this script may read, not
 * the application's own contract with itself.
 */
export interface ManifestShape {
    name: string;
    subdomain: string;
    dependsOn?: readonly EdgeFact[];
    routes?: readonly RouteRecordShape[];
    navigation?: readonly NavigationShape[];
    locales?: Record<string, unknown>;
}

/** A vue-router record, in the fields a page reports. */
export interface RouteRecordShape {
    path?: string;
    name?: string;
    meta?: { access?: string };
    component?: unknown;
    children?: readonly RouteRecordShape[];
}

/** A navigation entry, in the fields a page reports. */
export interface NavigationShape {
    name: string;
    label: string;
    section?: string;
    order?: number;
    icon?: unknown;
    badge?: unknown;
}

/** One edge of the context map. */
export interface EdgeFact {
    module: string;
    as: string;
    because: string;
}

/** Everything one module page needs. */
export interface ModuleFacts {
    name: string;
    subdomain: string;
    dependsOn: EdgeFact[];
    /** Edges pointing AT this module, derived from every sibling's `dependsOn`. */
    dependents: (EdgeFact & { from: string })[];
    routes: RouteFact[];
    navigation: NavigationFact[];
    apiCalls: ApiCallFact[];
    store?: StoreFact;
    /** Analytics event constants this domain's own files reference. */
    analyticsEvents: string[];
    files: FileFact[];
    locales: string[];
    /** Components and composables published through the barrel. */
    published: string[];
    unitTests: number;
    e2eTests: number;
    snapshots: number;
}

/** Every file under `dir`, as paths relative to it, sorted. */
const walk = (directory: string, base = directory): string[] => {
    if (!existsSync(directory)) return [];
    return readdirSync(directory)
        .flatMap((entry) => {
            const full = path.join(directory, entry);
            if (statSync(full).isDirectory()) return walk(full, base);
            return [path.relative(base, full)];
        })
        .toSorted();
};

/**
 * The `.vue` file a lazy route component points at.
 *
 * Read from the loader's source rather than by calling it: invoking the import would pull the whole
 * component graph in for a filename, and the filename is all a page needs.
 */
const viewOf = (component: unknown, moduleName: string): string => {
    if (typeof component !== 'function') return '—';
    const source = String(component);
    const match = /["']([^"']+\.vue)["']/.exec(source);
    if (!match) return '—';

    /* Vite resolves the `@/` alias before the loader reaches here, so the path arrives as
     * `/src/modules/cart/views/Cart.vue`. Both spellings are stripped to the module-relative form;
     * a view belonging to another folder keeps its repo-relative path, which is the useful answer. */
    return match[1]
        .replace(new RegExp(`^/?(?:@/|src/)?modules/${moduleName}/`), '')
        .replace(/^\//, '');
};

/** Route records, flattened, so a child screen is a row rather than a nested object. */
const readRoutes = (
    records: readonly RouteRecordShape[],
    moduleName: string,
    depth = 0
): RouteFact[] =>
    records.flatMap((record) => [
        {
            path: record.path ?? '',
            name: record.name ?? '—',
            access: record.meta?.access ?? 'public',
            view: viewOf(record.component, moduleName),
            depth
        },
        ...readRoutes(record.children ?? [], moduleName, depth + 1)
    ]);

/**
 * The endpoints a module calls, read from its `response-schemas.ts` source.
 *
 * Static rather than runtime, because the useful column is the **name** of the Zod export each row
 * pairs with — `GetCartResponse` — and a compiled schema object cannot say what it was called. The
 * rows are literals, so the source is the more precise reading of the two.
 *
 * Path patterns are anchored regexes in the file (`/^\/cart\/[^/]+$/`), and the scan requires both
 * anchors — a character class holds an unescaped `/`, so `^`…`$` is the only reliable boundary. The
 * anchors and escapes are noise in a table, and `[^/]+` becomes `{id}` so a row reads the way the
 * contract writes it.
 */
const readApiCalls = (moduleName: string): ApiCallFact[] => {
    const file = path.join(MODULES_DIR, moduleName, 'response-schemas.ts');
    if (!existsSync(file)) return [];

    const source = readFileSync(file, 'utf8');
    const rows: ApiCallFact[] = [];
    const rowPattern =
        /method:\s*'([A-Z]+)'[\S\s]{0,120}?pattern:\s*\/\^([\S\s]*?)\$\/[\S\s]{0,120}?schema:\s*schemas\.(\w+)/g;

    for (const match of source.matchAll(rowPattern))
        rows.push({
            method: match[1],
            pattern: match[2].replaceAll('[^/]+', '{id}').replaceAll(String.raw`\/`, '/'),
            schema: match[3]
        });

    return rows.toSorted(
        (a, b) => a.pattern.localeCompare(b.pattern) || a.method.localeCompare(b.method)
    );
};

/** The store's public surface: what the setup function returns, sorted into three kinds. */
const readStore = async (
    server: ViteDevServer,
    moduleName: string,
    pinia: typeof import('pinia')
): Promise<StoreFact | undefined> => {
    const storePath = path.join(MODULES_DIR, moduleName, 'store.ts');
    if (!existsSync(storePath)) return undefined;

    const exported = (await server.ssrLoadModule(`/src/modules/${moduleName}/store.ts`)) as Record<
        string,
        unknown
    >;
    const useStore = Object.entries(exported).find(([key]) => key.startsWith('use'))?.[1];
    if (typeof useStore !== 'function') return undefined;

    pinia.setActivePinia(pinia.createPinia());
    const store = (useStore as () => Record<string, unknown>)();
    const stateKeys = Object.keys((store as { $state?: object }).$state ?? {});

    const state: string[] = [];
    const getters: string[] = [];
    const actions: string[] = [];
    for (const key of Object.keys(store)) {
        if (key.startsWith('$') || key.startsWith('_')) continue;
        if (typeof store[key] === 'function') actions.push(key);
        else if (stateKeys.includes(key)) state.push(key);
        else getters.push(key);
    }

    return { id: (store as { $id: string }).$id, state, getters, actions };
};

/** Analytics event constants this domain's own files name. Static scan: the names are literals. */
const readAnalyticsEvents = (moduleName: string): string[] => {
    const folder = path.join(MODULES_DIR, moduleName);
    const found = new Set<string>();
    for (const relative of walk(folder)) {
        if (!/\.(ts|vue)$/.test(relative)) continue;
        const source = readFileSync(path.join(folder, relative), 'utf8');
        for (const match of source.matchAll(/analyticsEvents\.([\dA-Z_]+)/g)) found.add(match[1]);
    }
    return [...found].toSorted();
};

/**
 * What the barrel publishes, by name.
 *
 * Read from `index.ts`'s source rather than by importing it, for the same reason `viewOf` reads a
 * loader's source: a barrel here re-exports `.vue` components, and importing one pulls Vuetify and
 * its stylesheets in to answer a question about names. The export statements are literals, so the
 * source is both cheaper and the more precise reading.
 */
const readPublished = (moduleName: string): string[] => {
    const file = path.join(MODULES_DIR, moduleName, 'index.ts');
    if (!existsSync(file)) return [];

    const source = readFileSync(file, 'utf8');
    const names = new Set<string>();

    // `export { a, b as c } from './x'` and `export type { T } from './x'`
    for (const match of source.matchAll(/export\s+(?:type\s+)?{([^}]+)}/g))
        for (const specifier of match[1].split(','))
            if (specifier.trim())
                names.add(
                    specifier
                        .trim()
                        .split(/\s+as\s+/)
                        .pop()!
                        .trim()
                );

    // `export const x`, `export function x`, `export type X`, `export interface X`
    for (const match of source.matchAll(
        /export\s+(?:const|function|class|type|interface)\s+([\w$]+)/g
    ))
        names.add(match[1]);

    return [...names].toSorted();
};

/** Gather everything every page needs, for every enabled module. */
export const gatherFacts = async (
    server: ViteDevServer,
    appModules: readonly ManifestShape[],
    pinia: typeof import('pinia')
): Promise<ModuleFacts[]> => {
    const facts: ModuleFacts[] = [];

    for (const appModule of appModules) {
        const folder = path.join(MODULES_DIR, appModule.name);
        const files = walk(folder).map((relative): FileFact => {
            const shape = shapeOf(relative);
            return {
                path: relative,
                what: shape?.what ?? '**Undocumented shape.**',
                reads: shape?.reads,
                unknown: !shape
            };
        });

        facts.push({
            name: appModule.name,
            subdomain: appModule.subdomain,
            dependsOn: [...(appModule.dependsOn ?? [])],
            dependents: [],
            routes: readRoutes(appModule.routes ?? [], appModule.name),
            navigation: (appModule.navigation ?? []).map((entry): NavigationFact => ({
                routeName: entry.name,
                label: entry.label,
                section: entry.section ?? 'main',
                order: entry.order,
                icon: Boolean(entry.icon),
                badge: Boolean(entry.badge)
            })),
            apiCalls: readApiCalls(appModule.name),
            store: await readStore(server, appModule.name, pinia),
            analyticsEvents: readAnalyticsEvents(appModule.name),
            files,
            locales: Object.keys(appModule.locales ?? {}).toSorted(),
            published: readPublished(appModule.name),
            unitTests: files.filter((file) => /^tests\/[^/]+\.spec\.ts$/.test(file.path)).length,
            e2eTests: files.filter((file) => file.path.endsWith('.cy.ts')).length,
            snapshots: files.filter((file) => file.path.endsWith('.png')).length
        });
    }

    // Second pass: an edge is only visible from its own end, and the interesting half is the other.
    for (const one of facts)
        for (const edge of one.dependsOn) {
            const target = facts.find((other) => other.name === edge.module);
            target?.dependents.push({ ...edge, from: one.name });
        }

    return facts.toSorted((a, b) => a.name.localeCompare(b.name));
};
