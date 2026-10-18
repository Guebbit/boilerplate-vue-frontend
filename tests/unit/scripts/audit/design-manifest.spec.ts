/**
 * `scripts/audit/design-manual/scripts/manifest.ts` — the parts of one capture run become one manifest.
 */
import { describe, expect, it } from 'vitest';
import {
    type DesignCaptureManifest,
    type DesignShot,
    mergeManifests
} from '../../../../scripts/audit/design-manual/scripts/manifest';

/** A shot with only what the merge looks at. */
const shotNamed = (id: string): DesignShot => ({ id }) as DesignShot;

/** A manifest part holding the given shots. */
const part = (
    shots: string[],
    extra: Partial<DesignCaptureManifest> = {}
): DesignCaptureManifest => ({
    version: 1,
    gitHead: 'abc',
    dirty: [],
    capturedAt: '2026-10-18T00:00:00Z',
    scope: '',
    viewports: {},
    chromeSources: [],
    shots: shots.map((id) => shotNamed(id)),
    ...extra
});

describe('mergeManifests', () => {
    it('keeps the shots in run order', () => {
        const merged = mergeManifests([part(['a', 'b']), part(['c'])]);

        expect(merged.shots.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    });

    it('takes the header from the first part', () => {
        const merged = mergeManifests([
            part(['a'], { gitHead: 'first' }),
            part(['b'], { gitHead: 'second' })
        ]);

        expect(merged.gitHead).toBe('first');
    });

    it('unions the viewports and the chrome sources', () => {
        const merged = mergeManifests([
            part(['a'], {
                viewports: { phone: { width: 390, height: 844, touch: true } },
                chromeSources: ['src/App.vue', 'src/Bar.vue']
            }),
            part(['b'], {
                viewports: { desktop: { width: 1280, height: 800, touch: false } },
                chromeSources: ['src/Bar.vue']
            })
        ]);

        expect(Object.keys(merged.viewports).toSorted()).toEqual(['desktop', 'phone']);
        expect(merged.chromeSources).toEqual(['src/App.vue', 'src/Bar.vue']);
    });

    it('refuses two shots with one id', () => {
        expect(() => mergeManifests([part(['a']), part(['a'])])).toThrow(/share the id a/);
    });

    it('refuses to merge nothing', () => {
        expect(() => mergeManifests([])).toThrow(RangeError);
    });
});
