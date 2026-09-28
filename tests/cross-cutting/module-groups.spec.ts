/**
 * Every enabled module sits on the `foundation | shop` axis — `MODULE_GROUPS` in
 * `scripts/module-groups.ts`, the FE mirror of the backend's own `module.yaml#group` field.
 *
 * The map is hand-maintained on purpose (`DECISIONS_0926_7_FRONTEND_LAYOUT.md`, "Folder split —
 * Answer": a label, no folder move): a module with no entry fails here rather than defaulting
 * silently, which is what makes adding one a deliberate choice instead of an omission nobody
 * notices. `eslint.config.ts`'s `foundation-may-not-import-shop` rule reads the same map to lock
 * the direction in at import time; this spec is the completeness half of that guarantee.
 */

import { describe, expect, it } from 'vitest';
import { enabledModules } from '@/modules';
import { MODULE_GROUPS } from '../../scripts/module-groups';

describe('every module sits on the foundation | shop axis', () => {
    it('gives every enabled module a group', () => {
        const missing = enabledModules
            .filter(({ name }) => !MODULE_GROUPS[name])
            .map(
                ({ name }) =>
                    `Module "${name}" has no entry in MODULE_GROUPS. Add "foundation" or "shop" to scripts/module-groups.ts.`
            );

        expect(missing).toEqual([]);
    });

    it('names no group entry for a module that is not enabled', () => {
        const names = new Set(enabledModules.map(({ name }) => name));
        const stale = Object.keys(MODULE_GROUPS)
            .filter((name) => !names.has(name))
            .map((name) => `MODULE_GROUPS names "${name}", which is not an enabled module.`);

        expect(stale).toEqual([]);
    });

    /**
     * The guard on the guard: an empty registry, or an emptied `MODULE_GROUPS`, would satisfy
     * both checks above by checking nothing. A floor of 1 rather than this demo's module count —
     * deleting a domain must not also delete the canary.
     */
    it('is checking a non-empty set of modules and groups', () => {
        expect(enabledModules.length).toBeGreaterThanOrEqual(1);
        expect(Object.keys(MODULE_GROUPS).length).toBeGreaterThanOrEqual(1);
    });

    /**
     * The direction the lint rule locks in also holds today, checked the same way
     * `module-coupling.spec.ts` checks a backend edge: both `shop` and `foundation` are actually
     * used, so the rule has something on either side of it to enforce.
     */
    it('labels at least one module foundation and at least one shop', () => {
        const groups = new Set(Object.values(MODULE_GROUPS));
        expect(groups.has('foundation')).toBe(true);
        expect(groups.has('shop')).toBe(true);
    });
});
