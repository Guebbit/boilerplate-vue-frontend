/**
 * The dictionary board's three-source aggregation, tested against a faked store rather than a
 * mocked transport — `fetchBundledDictionary` goes through `import.meta.glob`, not `orvalMutator`,
 * so faking the store's three fetches directly is the boundary that avoids mocking two unrelated
 * loaders just to drive this composable's lookups.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useDictionaryAggregation } from '@/modules/locales/composables/use-dictionary-aggregation.ts';
import { LocaleTenantKind } from '@types';
import type { LocaleEntry } from '@types';

const OWN_TENANT = 'demo-fe';
const BACKEND_TENANT = 'demo-be';

const capabilities = ref([
    { tag: 'en', nativeName: 'English', source: 'dynamic' },
    { tag: 'static-only', nativeName: 'Static', source: 'static' }
]);

const tenants = ref([
    { id: OWN_TENANT, kind: LocaleTenantKind.frontend, label: 'Frontend' },
    { id: BACKEND_TENANT, kind: LocaleTenantKind.backend, label: 'Backend' }
]);

const entry = (key: string, value: string, tenant = OWN_TENANT): LocaleEntry => ({
    id: `entry-${key}-${tenant}`,
    locale: 'en',
    tenant,
    key,
    value
});

let entriesAnswer: LocaleEntry[];
let apiBaselineAnswer: Record<string, string>;
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

vi.mock('@/infrastructure/i18n/locale-overrides.ts', () => ({
    fetchLocaleOverrides: vi.fn(() => Promise.resolve({}))
}));

vi.mock('@/infrastructure/i18n', () => ({
    updateLocale: vi.fn(() => Promise.resolve())
}));

beforeEach(() => {
    setActivePinia(createPinia());
    entriesAnswer = [];
    apiBaselineAnswer = {};
    appBaselineAnswer = {};
});

describe('useDictionaryAggregation', () => {
    it('reads an overridden key as an entry, never a baseline', async () => {
        entriesAnswer = [entry('generic.search', 'Cerca')];
        appBaselineAnswer = { 'generic.search': 'Search' };
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        await board.loadLanguage('en');

        expect(board.cellState('en', 'generic.search')).toBe('entry');
        expect(board.entryAt('en', 'generic.search')?.value).toBe('Cerca');
        expect(board.isMissing('en', 'generic.search')).toBe(false);
    });

    it('reads an un-overridden bundled key as a baseline, not missing', async () => {
        appBaselineAnswer = { 'generic.search': 'Search' };
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        await board.loadLanguage('en');

        expect(board.cellState('en', 'generic.search')).toBe('baseline');
        expect(board.baselineAt('en', 'generic.search')).toBe('Search');
        expect(board.isMissing('en', 'generic.search')).toBe(false);
    });

    it('reads a key with neither an entry nor a baseline as missing', async () => {
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        await board.loadLanguage('en');

        expect(board.cellState('en', 'generic.nowhere')).toBe('missing');
        expect(board.isMissing('en', 'generic.nowhere')).toBe(true);
    });

    it('reads the API baseline for the backend tenant, never the bundled one', async () => {
        apiBaselineAnswer = { 'generic.search': 'Buscar (API)' };
        appBaselineAnswer = { 'generic.search': 'Search (bundled)' };
        const tenant = ref(BACKEND_TENANT);
        const board = useDictionaryAggregation(tenant);

        await board.loadLanguage('en');

        expect(board.baselineAt('en', 'generic.search')).toBe('Buscar (API)');
    });

    it('shows no baseline at all for a third-party tenant this build cannot read', async () => {
        appBaselineAnswer = { 'generic.search': 'Search' };
        const tenant = ref('some-other-tenant');
        const board = useDictionaryAggregation(tenant);

        await board.loadLanguage('en');

        expect(board.baselineAt('en', 'generic.search')).toBeUndefined();
        expect(board.cellState('en', 'generic.search')).toBe('missing');
    });

    it('unions entry keys, baseline keys and pending keys into allKeys', async () => {
        entriesAnswer = [entry('a.entry-only', 'x')];
        appBaselineAnswer = { 'b.baseline-only': 'y' };
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        await board.loadLanguage('en');
        board.addPendingKey('c.pending-only');

        expect(board.allKeys.value).toEqual(['a.entry-only', 'b.baseline-only', 'c.pending-only']);
    });

    it('forgets pending keys on resetPendingKeys, without touching saved keys', async () => {
        entriesAnswer = [entry('a.entry-only', 'x')];
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        await board.loadLanguage('en');
        board.addPendingKey('b.pending');
        board.resetPendingKeys();

        expect(board.allKeys.value).toEqual(['a.entry-only']);
    });

    it("counts each writable language's missing keys independently, skipping static-only languages", async () => {
        entriesAnswer = [entry('a.key', 'x')];
        const tenant = ref(OWN_TENANT);
        const board = useDictionaryAggregation(tenant);

        await board.loadLanguage('en');
        board.addPendingKey('b.missing-everywhere');

        expect(board.missingByTag.value).toEqual({ en: 1 });
        expect(board.languages.value.map((language) => language.tag)).toEqual(['en']);
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
});
