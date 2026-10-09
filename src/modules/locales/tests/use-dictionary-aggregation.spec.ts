/**
 * @module
 * Composable tests driven against a faked `useLocalesStore` — plain vars the mock's fetches
 * resolve with, reassigned per test — rather than a mocked transport. `fetchBundledDictionary`
 * goes through `import.meta.glob`, not `orvalMutator`, so faking the store's three fetches
 * directly is the boundary that avoids mocking two unrelated loaders just to drive this
 * composable's lookups.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useDictionaryAggregation } from '../composables/use-dictionary-aggregation.ts';
import { LocaleAppKind } from '@api';
import type { LocaleEntry } from '@types';

/**
 * This fixture build's own app id.
 */
const OWN_APP = 'demo-fe';

/**
 * The backend app id in this fixture's registry.
 */
const BACKEND_APP = 'demo-be';

/**
 * The faked manifest: one dynamic language and one static-only one.
 */
const capabilities = ref([
    { tag: 'en', nativeName: 'English', source: 'dynamic' },
    { tag: 'static-only', nativeName: 'Static', source: 'static' }
]);

/**
 * The faked app registry: this build's own app and the backend's.
 */
const apps = ref([
    { id: OWN_APP, kind: LocaleAppKind.frontend, label: 'Frontend' },
    { id: BACKEND_APP, kind: LocaleAppKind.backend, label: 'Backend' }
]);

/**
 * Builds one stored entry row for the fixtures below.
 */
const entry = (key: string, value: string, app = OWN_APP): LocaleEntry => ({
    id: `entry-${key}-${app}`,
    locale: 'en',
    app,
    key,
    value
});

/**
 * What the faked `fetchAllEntries` resolves with, set per test.
 */
let entriesAnswer: LocaleEntry[];

/**
 * What the faked `fetchApiDictionary` resolves with, set per test.
 */
let apiBaselineAnswer: Record<string, string>;

/**
 * What the faked `fetchBundledDictionary` resolves with, set per test.
 */
let appBaselineAnswer: Record<string, string>;

vi.mock('../store.ts', () => ({
    useLocalesStore: () => ({
        ownApp: OWN_APP,
        capabilities,
        apps,
        loading: ref(false),
        fetchApps: vi.fn(() => Promise.resolve(apps.value)),
        fetchLanguages: vi.fn(() => Promise.resolve(capabilities.value)),
        fetchAllEntries: vi.fn(() => Promise.resolve(entriesAnswer)),
        fetchApiDictionary: vi.fn(() => Promise.resolve(apiBaselineAnswer)),
        fetchBundledDictionary: vi.fn(() => Promise.resolve(appBaselineAnswer))
    })
}));

/**
 * The composable only asks this to run, never what it does internally — that pipeline (bundle
 * plus overrides, merged) is `locale-overrides.spec.ts`'s job to prove.
 */
const refreshRunningLocaleMock = vi.fn((_locale: string) => Promise.resolve());
vi.mock('@/infrastructure/locale-overrides.ts', () => ({
    refreshRunningLocale: (locale: string) => refreshRunningLocaleMock(locale)
}));

beforeEach(() => {
    setActivePinia(createPinia());
    entriesAnswer = [];
    apiBaselineAnswer = {};
    appBaselineAnswer = {};
});

describe('useDictionaryAggregation', () => {
    it('reads an overridden key as an entry, never a baseline', () => {
        entriesAnswer = [entry('generic.search', 'Cerca')];
        appBaselineAnswer = { 'generic.search': 'Search' };
        const app = ref(OWN_APP);
        const board = useDictionaryAggregation(app);

        return board.loadLanguage('en').then(() => {
            expect(board.cellState('en', 'generic.search')).toBe('entry');
            expect(board.entryAt('en', 'generic.search')?.value).toBe('Cerca');
            expect(board.isMissing('en', 'generic.search')).toBe(false);
        });
    });

    it('reads an un-overridden bundled key as a baseline, not missing', () => {
        appBaselineAnswer = { 'generic.search': 'Search' };
        const app = ref(OWN_APP);
        const board = useDictionaryAggregation(app);

        return board.loadLanguage('en').then(() => {
            expect(board.cellState('en', 'generic.search')).toBe('baseline');
            expect(board.baselineAt('en', 'generic.search')).toBe('Search');
            expect(board.isMissing('en', 'generic.search')).toBe(false);
        });
    });

    it('reads a key with neither an entry nor a baseline as missing', () => {
        const app = ref(OWN_APP);
        const board = useDictionaryAggregation(app);

        return board.loadLanguage('en').then(() => {
            expect(board.cellState('en', 'generic.nowhere')).toBe('missing');
            expect(board.isMissing('en', 'generic.nowhere')).toBe(true);
        });
    });

    it('reads the API baseline for the backend app, never the bundled one', () => {
        apiBaselineAnswer = { 'generic.search': 'Buscar (API)' };
        appBaselineAnswer = { 'generic.search': 'Search (bundled)' };
        const app = ref(BACKEND_APP);
        const board = useDictionaryAggregation(app);

        return board.loadLanguage('en').then(() => {
            expect(board.baselineAt('en', 'generic.search')).toBe('Buscar (API)');
        });
    });

    it('shows no baseline at all for a third-party app this build cannot read', () => {
        appBaselineAnswer = { 'generic.search': 'Search' };
        const app = ref('some-other-app');
        const board = useDictionaryAggregation(app);

        return board.loadLanguage('en').then(() => {
            expect(board.baselineAt('en', 'generic.search')).toBeUndefined();
            expect(board.cellState('en', 'generic.search')).toBe('missing');
        });
    });

    it('unions entry keys, baseline keys and pending keys into allKeys', () => {
        entriesAnswer = [entry('a.entry-only', 'x')];
        appBaselineAnswer = { 'b.baseline-only': 'y' };
        const app = ref(OWN_APP);
        const board = useDictionaryAggregation(app);

        return board.loadLanguage('en').then(() => {
            board.addPendingKey('c.pending-only');

            expect(board.allKeys.value).toEqual([
                'a.entry-only',
                'b.baseline-only',
                'c.pending-only'
            ]);
        });
    });

    it('forgets pending keys on resetPendingKeys, without touching saved keys', () => {
        entriesAnswer = [entry('a.entry-only', 'x')];
        const app = ref(OWN_APP);
        const board = useDictionaryAggregation(app);

        return board.loadLanguage('en').then(() => {
            board.addPendingKey('b.pending');
            board.resetPendingKeys();

            expect(board.allKeys.value).toEqual(['a.entry-only']);
        });
    });

    it("counts each writable language's missing keys independently, skipping static-only languages", () => {
        entriesAnswer = [entry('a.key', 'x')];
        const app = ref(OWN_APP);
        const board = useDictionaryAggregation(app);

        return board.loadLanguage('en').then(() => {
            board.addPendingKey('b.missing-everywhere');

            expect(board.missingByTag.value).toEqual({ en: 1 });
            expect(board.languages.value.map((language) => language.tag)).toEqual(['en']);
        });
    });

    it('reports no baseline for an app other than its own or the backend', () => {
        const app = ref('some-other-app');
        const board = useDictionaryAggregation(app);

        expect(board.hasBaseline.value).toBe(false);
    });

    it("reports a baseline for this build's own app and for the backend app", () => {
        const ownAppRef = ref(OWN_APP);
        expect(useDictionaryAggregation(ownAppRef).hasBaseline.value).toBe(true);

        const backendAppRef = ref(BACKEND_APP);
        expect(useDictionaryAggregation(backendAppRef).hasBaseline.value).toBe(true);
    });

    /**
     * `afterWrite` is every write's own courtesy refresh: the column (so the board reflects the
     * save), the manifest's counts, and the RUNNING app's copy of the language — so an edit shows
     * without a full reload. This only proves the composable asks for that refresh; the actual
     * fix (bundle plus overrides, merged, re-derived rather than layered onto whatever happens to
     * be loaded) is `locale-overrides.spec.ts`'s job.
     */
    it("refreshes the running app's dictionary as part of every write's aftermath", () => {
        const app = ref(OWN_APP);
        const board = useDictionaryAggregation(app);

        return board.afterWrite('en').then(() => {
            expect(refreshRunningLocaleMock).toHaveBeenCalledWith('en');
        });
    });
});
