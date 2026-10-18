import { describe, it, expect } from 'vitest';
import { DEMO_MODULE_NAMES } from '@/demo-modules';
import { enabledModules } from '@/modules';
import { MODULE_GROUPS } from '../../scripts/module-groups';

/**
 * `DEMO_MODULE_NAMES` has to stay equal to `enabledModules` in both directions — a name
 * here `src/modules.ts` does not mount is a manifest lying about what `npm run demo:remove`
 * deletes, and a shop module `src/modules.ts` mounts but this list forgot would survive a strip
 * silently, the exact drift `docs/theory/module-lifecycle.md`'s sweep canaries exist to catch on
 * the backend.
 */
describe('demo manifest', () => {
    it('names only modules this build actually mounts', () => {
        const mounted = new Set(enabledModules.map((appModule) => appModule.name));
        const unmounted = DEMO_MODULE_NAMES.filter((name) => !mounted.has(name));
        expect(unmounted).toEqual([]);
    });

    it('lists exactly the modules the group map marks shop or example, in both directions', () => {
        const removable = Object.entries(MODULE_GROUPS)
            .filter(([, group]) => group === 'shop' || group === 'example')
            .map(([name]) => name)
            .toSorted();

        expect(DEMO_MODULE_NAMES.toSorted()).toEqual(removable);
    });

    it('a canary that cannot pass empty: at least one module is demo-only and one is not', () => {
        const demoNames = new Set<string>(DEMO_MODULE_NAMES);
        expect(DEMO_MODULE_NAMES.length).toBeGreaterThan(0);
        expect(enabledModules.some((appModule) => !demoNames.has(appModule.name))).toBe(true);
    });
});
