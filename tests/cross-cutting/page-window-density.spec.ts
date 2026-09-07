/**
 * The toolkit's `pageItemList` is DENSE. Nothing that binds it needs to filter it, and a
 * `.filter(Boolean)` over it is dead code.
 *
 * The temptation is to distrust that. A paginated window LOOKS like it should be sparse — a
 * length covering the whole result set with only the current page filled in — and a reader acting
 * on that instinct writes a filter, finds `@typescript-eslint/no-unnecessary-condition` correctly
 * objecting that the element type cannot be falsy, and suppresses the rule to keep the filter.
 * Four views in this repo can attest.
 *
 * What actually happens: `pageItemList` resolves through `searchGet` → `getRecords`, which ends
 * in `.filter(Boolean)`. A record the cache names but the dictionary does not hold — never
 * fetched, or deleted after the page was cached — makes the window SHORTER. It never leaves a
 * hole.
 *
 * ── Why a spec rather than a comment ─────────────────────────────────────────────────────────
 * The claim is about a dependency's runtime behaviour. Its type (`ComputedRef<T[]>`) already says
 * the same thing, and saying it a third time in prose would persuade nobody who did not believe
 * the type. This checks. If a toolkit upgrade ever does start returning holes, it fails here and
 * names the reason, rather than four views quietly rendering `undefined`.
 *
 * Both entry points are covered: `useStructureSearchApi` directly, and `useStructureCrudApi`,
 * which is what every list store in this app is built on.
 */
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useStructureSearchApi, useStructureCrudApi } from '@guebbit/vue-toolkit';

/**
 * A minimal record shape: the toolkit only needs an identifier to key its dictionary.
 */
interface ProbeRow {
    /** Dictionary key. */
    id: string;
    /** Anything at all, so a returned row is distinguishable. */
    name: string;
}

/**
 * Fails when any element is `undefined` OR when any index is an actual array hole.
 *
 * Both are checked because they are different things: `[a, undefined, c]` has a defined length
 * and an undefined element, while a true sparse array is missing the index entirely and skips it
 * in `.map`/`.filter`. A view binding the array renders wrongly either way.
 *
 * @param window - The page window to inspect.
 */
const expectDense = (window: readonly (ProbeRow | undefined)[]) => {
    expect(window.includes(undefined)).toBe(false);
    expect(Array.from({ length: window.length }, (_, index) => index in window)).not.toContain(
        false
    );
};

describe('the toolkit page window is dense', () => {
    it('drops a record the API answered with as `undefined`, rather than keeping a hole', () => {
        setActivePinia(createPinia());
        const filters = ref({ query: 'anything' });
        const api = useStructureSearchApi<ProbeRow, string>(filters);

        return api
            .fetchSearch(
                () => Promise.resolve([{ id: 'a', name: 'A' }, undefined, { id: 'c', name: 'C' }]),
                filters.value,
                1,
                10
            )
            .then(() => {
                expect(api.pageItemList.value).toHaveLength(2);
                expectDense(api.pageItemList.value);
            });
    });

    it('shortens the window when a cached record is deleted, rather than leaving a hole', () => {
        setActivePinia(createPinia());
        const filters = ref({ query: 'anything' });
        const api = useStructureSearchApi<ProbeRow, string>(filters);

        return api
            .fetchSearch(
                () =>
                    Promise.resolve([
                        { id: 'a', name: 'A' },
                        { id: 'b', name: 'B' },
                        { id: 'c', name: 'C' }
                    ]),
                filters.value,
                1,
                10
            )
            .then(() => {
                expect(api.pageItemList.value).toHaveLength(3);
                // The page cache still names `b`; the dictionary no longer holds it.
                api.deleteRecord('b');
                expect(api.pageItemList.value).toHaveLength(2);
                expectDense(api.pageItemList.value);
            });
    });

    it('holds for `useStructureCrudApi`, which every list store here is built on', () => {
        setActivePinia(createPinia());
        const api = useStructureCrudApi<ProbeRow, string>({
            // Only `search` is exercised; `watchList` calls it and nothing else here does.
            search: () =>
                Promise.resolve([{ id: 'a', name: 'A' }, undefined, { id: 'c', name: 'C' }])
        });

        // `immediate: false`: the watcher would fire on mount, and this test drives it by hand.
        const { search } = api.watchList({ immediate: false });

        return search(true).then(() => {
            expect(api.pageItemList.value).toHaveLength(2);
            expectDense(api.pageItemList.value);
        });
    });
});
