/**
 * Every file in a module folder is a shape someone named on purpose.
 *
 * A module is a vocabulary as much as a folder: `module.ts`, `routes.ts`, `store.ts`,
 * `views/*.vue`, `response-schemas.ts`. That vocabulary is what makes fourteen domains legible to
 * someone who has read one of them — and it holds only as long as nothing else quietly appears
 * beside it. A `helpers/`, a `utils.ts`, a `constants.ts`: each is reasonable on its own, and
 * together they are the end of the pattern, because the next person copies whatever they find.
 *
 * So a file matching no entry in the catalogue below fails, by name. Adding a shape costs one line
 * here, and writing that line is the point: it is the moment to ask whether the shape should exist
 * at all, rather than the moment it becomes invisible.
 *
 * Nothing else in this suite covers this. `store-location.spec.ts` rules on store FILENAMES,
 * `subdomain-discipline.spec.ts` on whether a `domain/` folder is allowed — neither sweeps the
 * whole folder, and a stray file passes both.
 *
 * ── Where this came from ─────────────────────────────────────────────────────────────────────
 * This catalogue used to live in `scripts/module-docs/shapes.ts`, where it rendered the **Files**
 * table on every module page and, as a side effect, enforced this rule. The generator is gone and
 * the module pages are written by hand; the rule was the half worth keeping, so it moved here
 * where rules live. The one-line description is kept even though nothing renders it any more —
 * see above for why.
 *
 * See: docs/theory/modules.md
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enabledModules } from '@/modules';

const MODULES_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/modules');

/** One entry: the pattern a module-relative path matches, and what that file is. */
interface FileShape {
    /** Matched against the module-relative path, e.g. `views/Cart.vue`. */
    match: RegExp;

    /** One line, present tense, describing the file's job. */
    what: string;
}

/** Ordered most-specific first: the first match wins. */
const FILE_SHAPES: readonly FileShape[] = [
    {
        match: /^module\.ts$/,
        what: 'The manifest — the only file the application loads directly. Declares the name, routes, navigation entries, response schemas, dependency edges and locales.'
    },
    {
        match: /^index\.ts$/,
        what: 'The public barrel: the only surface a sibling module may import.'
    },
    {
        match: /^routes\.ts$/,
        what: 'The domain’s route records, spliced into the localised route tree. Each carries its own `meta.access`.'
    },
    {
        match: /^store\.ts$/,
        what: 'The Pinia store: this domain’s state, and every call it makes to the generated client.'
    },
    {
        match: /^stores\/.+\.ts$/,
        what: 'One of several Pinia stores, for a module that has more than one. `store.ts` is the usual shape.'
    },
    {
        match: /^response-schemas\.ts$/,
        what: 'One row per endpoint this domain calls, pairing a method and path pattern with the Zod envelope its response is validated against.'
    },
    {
        match: /^schemas\.ts$/,
        what: 'Form schemas for this domain, built on the generated request schemas rather than hand-written beside them.'
    },
    {
        match: /^domain\/index\.ts$/,
        what: 'The domain barrel.'
    },
    {
        match: /^domain\/.+\.ts$/,
        what: 'Pure client-side rules over plain data — no store, no component, no axios.'
    },
    {
        match: /^views\/.+\.vue$/,
        what: 'A routed screen. Reads its store, renders, and holds no fetching logic of its own.'
    },
    {
        match: /^components\/.+\.vue$/,
        what: 'A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.'
    },
    {
        match: /^composables\/.+\.ts$/,
        what: 'Reusable reactive logic for this domain — the tier between a store and a component.'
    },
    {
        match: /^locales\/.+\.json$/,
        what: 'This domain’s translation dictionary for one language, loaded as its own chunk.'
    },
    {
        match: /^guards\.ts$/,
        what: '`demo` only. The route guards that keep the showcase out of a production build.'
    },
    {
        match: /^provided\.ts$/,
        what: '`demo` only. The sample data the showcase renders, so no screen invents its own.'
    },
    {
        match: /^dictionaries\.ts$/,
        what: '`locales` only. The runtime override merge — server rows layered over what the app bundles, key by key.'
    },
    {
        match: /^types\.ts$/,
        what: '`admin` only. The shapes the dashboard assembles that no endpoint answers with directly.'
    },
    {
        match: /^use-realtime-observability\.ts$/,
        what: '`realtime` only. The composable a screen uses to subscribe to that stream and unsubscribe on unmount.'
    },
    {
        match: /^tests\/e2e\/__snapshots__\/.+\.png$/,
        what: 'A committed visual-regression baseline.'
    },
    {
        match: /^tests\/e2e\/.+\.cy\.ts$/,
        what: 'Cypress suite — the screens, in a browser.'
    },
    {
        match: /^tests\/.+\.spec\.ts$/,
        what: 'Vitest suite — the store, the routes and the rules, in isolation.'
    }
];

/** Every file under `directory`, as paths relative to it, sorted. */
const walk = (directory: string, base = directory): string[] => {
    if (!existsSync(directory)) return [];
    return readdirSync(directory)
        .flatMap((entry) => {
            const full = path.join(directory, entry);
            return statSync(full).isDirectory() ? walk(full, base) : [path.relative(base, full)];
        })
        .toSorted();
};

/** Every module-relative file path, paired with the module it belongs to. */
const filesInModules = (): { module: string; file: string }[] =>
    enabledModules.flatMap((appModule) =>
        walk(path.join(MODULES_ROOT, appModule.name)).map((file) => ({
            module: appModule.name,
            file
        }))
    );

describe('the module file vocabulary', () => {
    it('describes every file a module folder holds', () => {
        const unknown = filesInModules()
            .filter(({ file }) => !FILE_SHAPES.some((shape) => shape.match.test(file)))
            .map(
                ({ module, file }) =>
                    `src/modules/${module}/${file} matches no shape. Add one line to FILE_SHAPES describing it — or reconsider whether the file belongs in a module at all.`
            );

        expect(unknown).toEqual([]);
    });

    /**
     * The guard on the guard: an empty sweep would satisfy the rule above by checking nothing,
     * and a broken `walk` or an emptied registry looks exactly like a clean codebase from here.
     */
    it('is sweeping the files it is meant to be sweeping', () => {
        expect(filesInModules().length).toBeGreaterThan(100);
    });
});
