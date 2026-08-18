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
    scopes: ['app'],
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
    scope: 'app',
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
    vi.clearAllMocks();
    responses = {
        'GET /locales': {
            data: { locales: [CAPABILITY], default: 'en', fallback: 'en' }
        },
        'POST /locales': { data: LANGUAGE },
        'PUT /locales/es': { data: LANGUAGE },
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

    it('reads a bare payload as an empty manifest, not a crash', () => {
        responses['GET /locales'] = { data: undefined };
        const store = useLocalesStore();
        return store.fetchLanguages().then(() => {
            expect(store.capabilities).toEqual([]);
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
            const call = vi.mocked(orvalMutator).mock.calls[0]![0] as { data?: unknown };
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
            .addEntry('es', { scope: 'app', key: 'generic.search', value: 'Buscar' })
            .then((entry) => {
                expect(entry).toEqual(ENTRY);
                expect(requestedUrls()).toEqual(['POST /locales/es/entries']);
            });
    });

    it('edits only the value — the key is identity and stays out of the body', () => {
        const store = useLocalesStore();
        return store.editEntry('es', 'locale-entry-1', 'Cercar').then((entry) => {
            const call = vi.mocked(orvalMutator).mock.calls[0]![0] as { data?: unknown };
            expect(call.data).toEqual({ value: 'Cercar' });
            expect(entry?.value).toBe('Cercar');
        });
    });

    it('routes a merge to PATCH and answers the counted result', () => {
        const store = useLocalesStore();
        return store
            .importEntries('es', 'merge', 'app', [{ key: 'a', value: 'b' }])
            .then((result) => {
                expect(requestedUrls()).toEqual(['PATCH /locales/es/entries']);
                expect(result?.removed).toBe(0);
            });
    });

    it('routes a replace to PUT — the method carries the deleting semantics', () => {
        const store = useLocalesStore();
        return store
            .importEntries('es', 'replace', 'app', [{ key: 'a', value: 'b' }])
            .then((result) => {
                expect(requestedUrls()).toEqual(['PUT /locales/es/entries']);
                expect(result?.removed).toBe(5);
            });
    });

    it('names the scope once for the whole batch, exactly as the contract shapes it', () => {
        const store = useLocalesStore();
        return store.importEntries('es', 'merge', 'api', [{ key: 'a', value: 'b' }]).then(() => {
            const call = vi.mocked(orvalMutator).mock.calls[0]![0] as { data?: unknown };
            expect(call.data).toEqual({ scope: 'api', entries: [{ key: 'a', value: 'b' }] });
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
