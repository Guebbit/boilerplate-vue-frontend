/**
 * What every file shape inside `src/modules/<name>/` is, in one line each.
 *
 * The catalogue the file-coverage check reads: a file matching no pattern here fails
 * `npm run check:module-docs` by name. A new shape is a deliberate addition to the module
 * vocabulary, so it costs one line here and stops being invisible.
 *
 * Mirrors `scripts/module-docs/shapes.ts` in the paired backend on the idea, not on the list — the
 * shapes are a client's, so views and stores replace controllers and repositories.
 *
 * See: docs/theory/modules.md
 */

/** One entry: the pattern a module-relative path matches, and what that file is. */
interface FileShape {
    /** Matched against the module-relative path, e.g. `views/Cart.vue`. */
    match: RegExp;

    /** One line, present tense, describing the file's job. */
    what: string;

    /** Docs page that explains the mechanism this file participates in. */
    reads?: string;
}

/** Ordered most-specific first: the first match wins. */
export const FILE_SHAPES: readonly FileShape[] = [
    {
        match: /^module\.ts$/,
        what: 'The manifest — the only file the application loads directly. Declares the name, routes, navigation entries, response schemas, dependency edges and locales.',
        reads: '../theory/modules.md'
    },
    {
        match: /^index\.ts$/,
        what: 'The public barrel: the only surface a sibling module may import.',
        reads: '../theory/strategic-ddd.md'
    },
    {
        match: /^routes\.ts$/,
        what: 'The domain’s route records, spliced into the localised route tree. Each carries its own `meta.access`.',
        reads: '../theory/sitemap.md'
    },
    {
        match: /^store\.ts$/,
        what: 'The Pinia store: this domain’s state, and every call it makes to the generated client.',
        reads: '../tools/state-and-routing.md'
    },
    {
        match: /^stores\/.+\.ts$/,
        what: 'One of several Pinia stores, for a module that has more than one. `store.ts` is the usual shape.',
        reads: '../tools/state-and-routing.md'
    },
    {
        match: /^response-schemas\.ts$/,
        what: 'One row per endpoint this domain calls, pairing a method and path pattern with the Zod envelope its response is validated against.',
        reads: '../api/openapi-workflow.md'
    },
    {
        match: /^schemas\.ts$/,
        what: 'Form schemas for this domain, built on the generated request schemas rather than hand-written beside them.',
        reads: '../api/openapi-workflow.md'
    },
    {
        match: /^domain\/index\.ts$/,
        what: 'The domain barrel.',
        reads: '../theory/domain-layer.md'
    },
    {
        match: /^domain\/.+\.ts$/,
        what: 'Pure client-side rules over plain data — no store, no component, no axios.',
        reads: '../theory/domain-layer.md'
    },
    {
        match: /^views\/.+\.vue$/,
        what: 'A routed screen. Reads its store, renders, and holds no fetching logic of its own.',
        reads: '../theory/layers.md'
    },
    {
        match: /^components\/.+\.vue$/,
        what: 'A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.',
        reads: '../theory/layers.md'
    },
    {
        match: /^composables\/.+\.ts$/,
        what: 'Reusable reactive logic for this domain — the tier between a store and a component.',
        reads: '../theory/layers.md'
    },
    {
        match: /^locales\/.+\.json$/,
        what: 'This domain’s translation dictionary for one language, loaded as its own chunk.',
        reads: '../tools/i18n.md'
    },
    {
        match: /^guards\.ts$/,
        what: '`demo` only. The route guards that keep the showcase out of a production build.',
        reads: '../theory/sitemap.md'
    },
    {
        match: /^provided\.ts$/,
        what: '`demo` only. The sample data the showcase renders, so no screen invents its own.',
        reads: '../tools/demo-profile.md'
    },
    {
        match: /^dictionaries\.ts$/,
        what: '`locales` only. The runtime override merge — server rows layered over what the app bundles, key by key.',
        reads: '../tools/i18n.md'
    },
    {
        match: /^types\.ts$/,
        what: '`admin` only. The shapes the dashboard assembles that no endpoint answers with directly.',
        reads: '../tools/admin-dashboard.md'
    },
    {
        match: /^use-realtime-observability\.ts$/,
        what: '`realtime` only. The composable a screen uses to subscribe to that stream and unsubscribe on unmount.',
        reads: '../tools/realtime.md'
    },
    {
        match: /^tests\/e2e\/__snapshots__\/.+\.png$/,
        what: 'A committed visual-regression baseline.',
        reads: '../tools/visual-regression.md'
    },
    {
        match: /^tests\/e2e\/.+\.cy\.ts$/,
        what: 'Cypress suite — the screens, in a browser.',
        reads: '../tools/component-testing.md'
    },
    {
        match: /^tests\/.+\.spec\.ts$/,
        what: 'Vitest suite — the store, the routes and the rules, in isolation.',
        reads: '../tools/unit-testing.md'
    }
];

/** The shape a module-relative path matches, or `undefined` when nothing in the catalogue does. */
export const shapeOf = (relativePath: string): FileShape | undefined =>
    FILE_SHAPES.find((shape) => shape.match.test(relativePath));
