/**
 * Every enabled module sits on the `foundation | shop` axis — the `group` in its own
 * `src/modules/<name>/module.yaml`, the FE mirror of the backend's `module.yaml#group` field,
 * read by `scripts/module-manifest.ts`.
 *
 * A module with no `module.yaml`, or an invalid `group`, fails here rather than defaulting
 * silently, which is what makes adding one a deliberate choice instead of an omission nobody
 * notices. `eslint.config.ts`'s `foundation-may-not-import-shop` rule reads the same groups to
 * lock the direction in at import time; this spec is the completeness half of that guarantee.
 */

import { describe, expect, it } from 'vitest';
import { enabledModules } from '@/modules';
import {
    demoModuleNames,
    moduleFolderNames,
    moduleGroups,
    moduleManifestProblems
} from '../../scripts/module-manifest';

describe('every module sits on the foundation | shop axis', () => {
    it('gives every module folder a valid module.yaml group', () => {
        expect(moduleManifestProblems).toEqual([]);
    });

    it('gives every enabled module a group', () => {
        const missing = enabledModules
            .filter(({ name }) => !moduleGroups[name])
            .map(({ name }) => `Module "${name}" has no group in src/modules/${name}/module.yaml.`);

        expect(missing).toEqual([]);
    });

    it('has a module folder for every enabled module and the other way round', () => {
        const names = enabledModules.map(({ name }) => name).toSorted();

        expect(names).toEqual([...moduleFolderNames].toSorted());
    });

    /**
     * The guard on the guard: an empty registry, or no module.yaml read at all, would satisfy
     * the checks above by checking nothing. A floor of 1 rather than this demo's module count —
     * deleting a domain must not also delete the canary.
     */
    it('is checking a non-empty set of modules and groups', () => {
        expect(enabledModules.length).toBeGreaterThanOrEqual(1);
        expect(Object.keys(moduleGroups).length).toBeGreaterThanOrEqual(1);
    });

    /** `demo:remove` deletes exactly the `shop` and `example` groups, never `foundation`. */
    it('derives the demo modules from the shop and example groups only', () => {
        const names = demoModuleNames();

        expect(names.length).toBeGreaterThan(0);
        expect(names.map((name) => moduleGroups[name])).not.toContain('foundation');
    });
});
