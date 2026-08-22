/**
 * The locales store — transport-mocked like the inventory's spec.
 *
 * Worth pinning: every language write refetches the manifest BEFORE answering (the board renders
 * `LocaleCapability`, and the writes answer with `Language` — a record it is not shaped like),
 * and the entry writes keep the toolkit's search cache honest — a create resets it, an edit
 * patches the record in place.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { orvalMutator } from '@/infrastructure/http';

const CAPABILITY = {
    tag: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    active: true,
    tenants: ['demo-fe'],
    source: 'dynamic',
    entryCount: 2,
    revision: 3
};

const LANGUAGE = {
    id: 'language-es',
    tag: 'es',
    baseLanguage: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    active: true,
    revision: 3
};

const ENTRY = {
    id: 'locale-entry-1',
    locale: 'es',
    tenant: 'demo-fe',
    key: 'generic.search',
    value: 'Buscar'
};

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(responses[key]);
    })
}));

const requestedUrls = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.map(
            (call) =>
                `${(call[0] as { method: string }).method} ${(call[0] as { url: string }).url}`
        );

beforeEach(() => {
    setActivePinia(createPinia());
    // `reset`, not `clear`: the paging test swaps the implementation, and a reset puts the
    // table-driven one back for whatever runs after it.
    vi.resetAllMocks();
    responses = {
        'GET /locales': {
            data: { locales: [CAPABILITY], default: 'en', fallback: 'en' }
        },
        'POST /locales': { data: LANGUAGE },
        'PUT /locales/es': { data: LANGUAGE },
        'GET /locales/tenants': {
            data: {
                tenants: [
                    { id: 'demo-be', label: 'API', kind: 'backend' },
                    { id: 'demo-fe', label: 'Frontend', kind: 'frontend' }
                ]
            }
        },
        'DELETE /locales/es': { data: { message: 'Deleted' } },
        'POST /locales/es/entries': { data: ENTRY },
        'PUT /locales/es/entries/locale-entry-1': { data: { ...ENTRY, value: 'Cercar' } },
        'DELETE /locales/es/entries/locale-entry-1': { data: { message: 'Deleted' } },
        'PATCH /locales/es/entries': {
            data: { created: 2, updated: 1, removed: 0, revision: 4 }
        },
        'PUT /locales/es/entries': {
            data: { created: 2, updated: 1, removed: 5, revision: 4 }
        }
    };
});

describe('fetchLanguages', () => {
    it('replaces the manifest with what the API answered, defaults included', () => {
        const store = useLocalesStore();
        return store.fetchLanguages().then(() => {
            expect(store.capabilities.map(({ tag }) => tag)).toEqual(['es']);
            expect(store.defaultLocale).toBe('en');
            expect(store.fallbackLocale).toBe('en');
        });
    });
});

describe('language writes', () => {
    it('creates, then refetches the manifest before answering', () => {
        const store = useLocalesStore();
        return store
            .createLanguage({ tag: 'es', name: 'Spanish', nativeName: 'Español' })
            .then((language) => {
                expect(language).toEqual(LANGUAGE);
                expect(requestedUrls()).toEqual(['POST /locales', 'GET /locales']);
            });
    });

    it('edits without ever sending the tag in the body — it is not editable', () => {
        const store = useLocalesStore();
        return store.editLanguage('es', { name: 'Castilian' }).then(() => {
            const call = vi.mocked(orvalMutator).mock.calls[0][0] as { data?: unknown };
            expect(call.data).toEqual({ name: 'Castilian' });
            expect(requestedUrls()).toEqual(['PUT /locales/es', 'GET /locales']);
        });
    });

    it('removes, then refetches, so the board never shows a deleted language', () => {
        const store = useLocalesStore();
        return store.removeLanguage('es').then(() => {
            expect(requestedUrls()).toEqual(['DELETE /locales/es', 'GET /locales']);
        });
    });
});

describe('entry writes', () => {
    it('adds an entry against the language named in the call', () => {
        const store = useLocalesStore();
        return store
            .addEntry('es', { tenant: 'demo-fe', key: 'generic.search', value: 'Buscar' })
            .then((entry) => {
                expect(entry).toEqual(ENTRY);
                expect(requestedUrls()).toEqual(['POST /locales/es/entries']);
            });
    });

    it('edits only the value — the key is identity and stays out of the body', () => {
        const store = useLocalesStore();
        return store.editEntry('es', 'locale-entry-1', 'Cercar').then((entry) => {
            const call = vi.mocked(orvalMutator).mock.calls[0][0] as { data?: unknown };
            expect(call.data).toEqual({ value: 'Cercar' });
            expect(entry?.value).toBe('Cercar');
        });
    });

    it('routes a merge to PATCH and answers the counted result', () => {
        const store = useLocalesStore();
        return store
            .importEntries('es', 'merge', 'demo-fe', [{ key: 'a', value: 'b' }])
            .then((result) => {
                expect(requestedUrls()).toEqual(['PATCH /locales/es/entries']);
                expect(result?.removed).toBe(0);
            });
    });

    it('routes a replace to PUT — the method carries the deleting semantics', () => {
        const store = useLocalesStore();
        return store
            .importEntries('es', 'replace', 'demo-fe', [{ key: 'a', value: 'b' }])
            .then((result) => {
                expect(requestedUrls()).toEqual(['PUT /locales/es/entries']);
                expect(result?.removed).toBe(5);
            });
    });

    it('names the tenant once for the whole batch, exactly as the contract shapes it', () => {
        const store = useLocalesStore();
        return store
            .importEntries('es', 'merge', 'demo-be', [{ key: 'a', value: 'b' }])
            .then(() => {
                const call = vi.mocked(orvalMutator).mock.calls[0][0] as { data?: unknown };
                expect(call.data).toEqual({
                    tenant: 'demo-be',
                    entries: [{ key: 'a', value: 'b' }]
                });
            });
    });
});

describe('fetchAllEntries', () => {
    it('pages to completion rather than trusting one response to be everything', () => {
        const pageOne = {
            data: {
                items: [ENTRY],
                meta: { page: 1, pageSize: 100, totalItems: 2, totalPages: 2 }
            }
        };
        const pageTwo = {
            data: {
                items: [{ ...ENTRY, id: 'locale-entry-2', key: 'generic.cancel' }],
                meta: { page: 2, pageSize: 100, totalItems: 2, totalPages: 2 }
            }
        };
        let served = 0;
        responses['GET /locales/es/entries'] = undefined;
        vi.mocked(orvalMutator).mockImplementation(() =>
            Promise.resolve((served++ === 0 ? pageOne : pageTwo) as never)
        );
        const store = useLocalesStore();
        return store.fetchAllEntries('es').then((entries) => {
            expect(entries?.map(({ key }) => key)).toEqual(['generic.search', 'generic.cancel']);
        });
    });
});

describe('entry search and removal', () => {
    it('searches the language the filters name, through the toolkit search cache', () => {
        const store = useLocalesStore();
        responses['GET /locales/es/entries'] = { data: { items: [ENTRY] } };
        store.filters = { tag: 'es', text: 'bus', tenant: 'demo-fe' };
        return store
            .watchSearchEntries()
            .search()
            .then(() => {
                expect(requestedUrls()).toContain('GET /locales/es/entries');
            });
    });

    it("searches with an empty tag when the filters name none — the `?? ''` arm", () => {
        const store = useLocalesStore();
        responses['GET /locales//entries'] = { data: { items: [] } };
        store.filters = { text: 'bus' };
        return store
            .watchSearchEntries()
            .search()
            .then(() => {
                expect(requestedUrls()).toContain('GET /locales//entries');
            });
    });

    it('removes an entry against the row named in the call', () => {
        const store = useLocalesStore();
        return store.removeEntry('es', ENTRY.id).then(() => {
            expect(requestedUrls()).toContain('DELETE /locales/es/entries/locale-entry-1');
        });
    });
});

describe('fetchApiDictionary', () => {
    it('flattens the deployed tree into dotted keys, the shape the board cells read', () => {
        responses['GET /locales/es'] = {
            data: { locale: 'es', messages: { generic: { search: 'Buscar', list: ['a', 'b'] } } }
        };
        return useLocalesStore()
            .fetchApiDictionary('es')
            .then((dictionary) => {
                expect(dictionary).toEqual({
                    'generic.search': 'Buscar',
                    'generic.list.0': 'a',
                    'generic.list.1': 'b'
                });
            });
    });

    it('answers an empty dictionary for a language the API has no file for', () => {
        // A dynamic-only language is the normal case for a freshly added one, not an error.
        vi.mocked(orvalMutator).mockRejectedValueOnce(new Error('404'));
        return useLocalesStore()
            .fetchApiDictionary('xx')
            .then((dictionary) => {
                expect(dictionary).toEqual({});
            });
    });
});

describe('entriesPageTotal', () => {
    it("is the server's page count for THIS search, not the local cache divided by page size", () => {
        responses['GET /locales/fr/entries'] = {
            data: {
                items: [{ ...ENTRY, id: 'fr-1', locale: 'fr' }],
                meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
            }
        };
        const store = useLocalesStore();
        store.filters = { tag: 'fr' };
        return store
            .watchSearchEntries()
            .search()
            .then(() => {
                expect(store.entriesPageTotal).toBe(1);
            });
    });
});

describe('fetchBundledDictionary', () => {
    it('flattens the bundled dictionary of a shipped language', () =>
        useLocalesStore()
            .fetchBundledDictionary('en')
            .then((dictionary) => {
                expect(dictionary['generic.search']).toBe('Search');
            }));

    it('answers an empty dictionary for a language this build does not ship', () =>
        useLocalesStore()
            .fetchBundledDictionary('kl')
            .then((dictionary) => {
                expect(dictionary).toEqual({});
            }));
});

describe('the tenant registry', () => {
    it('loads the tenants and names the backend one', () => {
        const store = useLocalesStore();
        return store.fetchTenants().then(() => {
            expect(store.tenants.map(({ id }) => id)).toEqual(['demo-be', 'demo-fe']);
            expect(store.backendTenant).toBe('demo-be');
            expect(store.tenantLabel('demo-be')).toBe('API');
            // A stranger renders as its id rather than as nothing.
            expect(store.tenantLabel('nobody')).toBe('nobody');
        });
    });

    it("knows this build's own tenant without asking the API", () => {
        expect(useLocalesStore().ownTenant).toBe('demo-fe');
    });
});
