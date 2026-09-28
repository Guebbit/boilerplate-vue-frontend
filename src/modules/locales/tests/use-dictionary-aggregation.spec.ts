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
import { useDictionaryAggregation } from '@/modules/locales/composables/use-dictionary-aggregation.ts';
import { LocaleTenantKind } from '@api';
import type { LocaleEntry } from '@types';

/**
 * This fixture build's own tenant id.
 */
const OWN_TENANT = 'demo-fe';

/**
 * The backend tenant id in this fixture's registry.
 */
const BACKEND_TENANT = 'demo-be';

/**
 * The faked manifest: one dynamic language and one static-only one.
 */
const capabilities = ref([
    { tag: 'en', nativeName: 'English', source: 'dynamic' },
    { tag: 'static-only', nativeName: 'Static', source: 'static' }
]);

/**
 * The faked tenant registry: this build's own tenant and the backend's.
 */
const tenants = ref([
    { id: OWN_TENANT, kind: LocaleTenantKind.frontend, label: 'Frontend' },
    { id: BACKEND_TENANT, kind: LocaleTenantKind.backend, label: 'Backend' }
]);

/**
 * Builds one stored entry row for the fixtures below.
 */
const entry = (key: string, value: string, tenant = OWN_TENANT): LocaleEntry => ({
    id: `entry-${key}-${tenant}`,
    locale: 'en',
    tenant,
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

vi.mock('@/modules/locales/store.ts', () => ({
    useLocalesStore: () => ({
        ownTenant: OWN_TENANT,
        capabilities,
        tenants,
        loading: ref(false),
        fetchTenants: vi.fn(() => Promise.resolve(tenants.value)),
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
vi.mock('@/infrastructure/i18n/locale-overrides.ts', () => ({
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
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        return board.loadLanguage('en').then(() => {
            expect(board.cellState('en', 'generic.search')).toBe('entry');
            expect(board.entryAt('en', 'generic.search')?.value).toBe('Cerca');
            expect(board.isMissing('en', 'generic.search')).toBe(false);
        });
    });

    it('reads an un-overridden bundled key as a baseline, not missing', () => {
        appBaselineAnswer = { 'generic.search': 'Search' };
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        return board.loadLanguage('en').then(() => {
            expect(board.cellState('en', 'generic.search')).toBe('baseline');
            expect(board.baselineAt('en', 'generic.search')).toBe('Search');
            expect(board.isMissing('en', 'generic.search')).toBe(false);
        });
    });

    it('reads a key with neither an entry nor a baseline as missing', () => {
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        return board.loadLanguage('en').then(() => {
            expect(board.cellState('en', 'generic.nowhere')).toBe('missing');
            expect(board.isMissing('en', 'generic.nowhere')).toBe(true);
        });
    });

    it('reads the API baseline for the backend tenant, never the bundled one', () => {
        apiBaselineAnswer = { 'generic.search': 'Buscar (API)' };
        appBaselineAnswer = { 'generic.search': 'Search (bundled)' };
        const tenant = ref(BACKEND_TENANT);
        const board = useDictionaryAggregation(tenant);

        return board.loadLanguage('en').then(() => {
            expect(board.baselineAt('en', 'generic.search')).toBe('Buscar (API)');
        });
    });

    it('shows no baseline at all for a third-party tenant this build cannot read', () => {
        appBaselineAnswer = { 'generic.search': 'Search' };
        const tenant = ref('some-other-tenant');
        const board = useDictionaryAggregation(tenant);

        return board.loadLanguage('en').then(() => {
            expect(board.baselineAt('en', 'generic.search')).toBeUndefined();
            expect(board.cellState('en', 'generic.search')).toBe('missing');
        });
    });

    it('unions entry keys, baseline keys and pending keys into allKeys', () => {
        entriesAnswer = [entry('a.entry-only', 'x')];
        appBaselineAnswer = { 'b.baseline-only': 'y' };
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

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
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        return board.loadLanguage('en').then(() => {
            board.addPendingKey('b.pending');
            board.resetPendingKeys();

            expect(board.allKeys.value).toEqual(['a.entry-only']);
        });
    });

    it("counts each writable language's missing keys independently, skipping static-only languages", () => {
        entriesAnswer = [entry('a.key', 'x')];
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        return board.loadLanguage('en').then(() => {
            board.addPendingKey('b.missing-everywhere');

            expect(board.missingByTag.value).toEqual({ en: 1 });
            expect(board.languages.value.map((language) => language.tag)).toEqual(['en']);
        });
    });

    it('reports no baseline for a tenant other than its own or the backend', () => {
        const tenant = ref('some-other-tenant');
        const board = useDictionaryAggregation(tenant);

        expect(board.hasBaseline.value).toBe(false);
    });

    it("reports a baseline for this build's own tenant and for the backend tenant", () => {
        const ownTenantRef = ref(OWN_TENANT);
        expect(useDictionaryAggregation(ownTenantRef).hasBaseline.value).toBe(true);

        const backendTenantRef = ref(BACKEND_TENANT);
        expect(useDictionaryAggregation(backendTenantRef).hasBaseline.value).toBe(true);
    });

    /**
     * `afterWrite` is every write's own courtesy refresh: the column (so the board reflects the
     * save), the manifest's counts, and the RUNNING app's copy of the language — so an edit shows
     * without a full reload. This only proves the composable asks for that refresh; FA25's actual
     * fix (bundle plus overrides, merged, re-derived rather than layered onto whatever happens to
     * be loaded) is `locale-overrides.spec.ts`'s job.
     */
    it("refreshes the running app's dictionary as part of every write's aftermath", () => {
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        return board.afterWrite('en').then(() => {
            expect(refreshRunningLocaleMock).toHaveBeenCalledWith('en');
        });
    });
});
