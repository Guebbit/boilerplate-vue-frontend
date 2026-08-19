import { http, type HttpHandler } from 'msw';
import {
    GetLocalesResponse,
    GetLocaleMessagesResponse,
    CreateLocaleResponse,
    UpdateLocaleResponse,
    DeleteLocaleResponse,
    ListLocaleEntriesResponse,
    CreateLocaleEntryResponse,
    ReplaceLocaleEntriesResponse,
    MergeLocaleEntriesResponse,
    UpdateLocaleEntryResponse,
    DeleteLocaleEntryResponse
} from '@api/schemas';
import type {
    Language,
    LocaleEntry,
    LocaleCapability,
    LocaleScope,
    CreateLocaleRequest,
    UpdateLocaleRequest,
    CreateLocaleEntryRequest,
    ReplaceLocaleEntriesRequest,
    MergeLocaleEntriesRequest,
    LocaleEntryInput
} from '@types';
import {
    createErrorEnvelope,
    createSuccessEnvelope,
    createMessageResponse,
    getIsoDateNow,
    getQueryParameters,
    isCurrentMockUserAdmin,
    mockDatabase,
    readRequestBody,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta
} from '@mocks/mockDb.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';
import { expandEntries } from '../dictionaries';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/*
 * The whole `/locales` surface, writable.
 *
 * While this module is enabled these handlers SHADOW the static pair in
 * `tests/support/mocks/localesHandlers.ts` — module handlers register first in `apiMock.ts`, and
 * MSW takes the first match — so the manifest the language switcher boots from and the rows these
 * admin screens edit are finally the same data. Delete this module and the static pair takes the
 * two public reads back, which is exactly the consumer/author split the real deployment has.
 *
 * The STATIC tier below is what a deploy would have put on disk: three dictionary files. The
 * admin routes cannot touch it, only the dynamic rows in `mockDatabase.sampleLanguages` — which
 * is the same limit the real API has, and the reason `createLocale`'s description warns that a
 * new language does not teach the API to answer in it.
 */
const STATIC_TIER = [
    { tag: 'en', name: 'English', nativeName: 'English' },
    { tag: 'it', name: 'Italian', nativeName: 'Italiano' },
    { tag: 'es', name: 'Spanish', nativeName: 'Español' }
];

/** Admin-only, like every write in this module. The 403 envelope, or `undefined` to go on. */
const forbiddenUnlessAdmin = () =>
    isCurrentMockUserAdmin()
        ? undefined
        : toMockJsonResponse(createErrorEnvelope(403, 'FORBIDDEN', 'Admin only'), {
              status: 403,
              schema: MockErrorResponse
          });

const notFound = () =>
    toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Error: invalid data provided.'), {
        status: 404,
        schema: MockErrorResponse
    });

const languages = () => (mockDatabase.sampleLanguages ??= []);
const entries = () => (mockDatabase.sampleLocaleEntries ??= []);

const findLanguage = (tag: string) => languages().find((language) => language.tag === tag);

const entriesOf = (tag: string, scope?: LocaleScope) =>
    entries().filter((entry) => entry.locale === tag && (!scope || entry.scope === scope));

/**
 * The write-time collision the contract documents on `LocaleEntryInput.key`: an exact duplicate,
 * or a key that is a strict prefix of an existing one or has one as a prefix. Scope-local, since
 * the two dictionaries are separate keyspaces.
 */
const findCollision = (tag: string, scope: LocaleScope, key: string) =>
    entriesOf(tag, scope).find(
        (entry) =>
            entry.key === key || entry.key.startsWith(`${key}.`) || key.startsWith(`${entry.key}.`)
    );

let mockEntryIdCounter = 1000;

/** One capability row, merging what the two tiers each know about a tag. */
const toCapability = (tag: string): LocaleCapability => {
    const deployed = STATIC_TIER.find((entry) => entry.tag === tag);
    const dynamic = findLanguage(tag);
    const named = dynamic ?? deployed;
    return {
        tag,
        name: named?.name ?? tag,
        nativeName: named?.nativeName ?? tag,
        direction: dynamic?.direction ?? 'ltr',
        // A deployed file has no off switch, so a static-only language is always selectable.
        active: dynamic?.active ?? true,
        // `app` rides on the dynamic row's existence; whether a VISITOR may see the row at all
        // is decided above, which is the only job `active` has.
        scopes: [...(deployed ? (['api'] as const) : []), ...(dynamic ? (['app'] as const) : [])],
        source: deployed && dynamic ? 'both' : deployed ? 'static' : 'dynamic',
        entryCount: entriesOf(tag).length,
        revision: dynamic?.revision ?? 0
    };
};

export const registerLocalesAdminMockHandlers = (): HttpHandler[] => [
    /*
     * The manifest, and the one place `active` does its work: it gates what a VISITOR may select,
     * nothing else. A guest or user sees only active languages; an admin sees every row, inactive
     * included, because the admin is who toggles the flag and edits what is behind it.
     */
    http.get(`${API_BASE}/locales`, () => {
        const admin = isCurrentMockUserAdmin();
        const tags = [
            ...new Set([
                ...STATIC_TIER.map(({ tag }) => tag),
                ...languages()
                    .filter(({ active }) => active || admin)
                    .map(({ tag }) => tag)
            ])
        ].toSorted();
        return toMockJsonResponse(
            createSuccessEnvelope({
                locales: tags.map((tag) => toCapability(tag)),
                default: 'en',
                fallback: 'en'
            }),
            { schema: GetLocalesResponse, delayMs: 0 }
        );
    }),

    // The client dictionary: `app` rows expanded into the nested shape a client merges.
    http.get(`${API_BASE}/locales/:locale/messages`, ({ params }) => {
        const language = findLanguage(String(params.locale));
        // Unknown and deactivated answer alike; the client treats both as "nothing edited here".
        if (!language?.active) return notFound();
        return toMockJsonResponse(
            createSuccessEnvelope({
                locale: language.tag,
                revision: language.revision,
                messages: expandEntries(entriesOf(language.tag, 'app'))
            }),
            { schema: GetLocaleMessagesResponse, delayMs: 0 }
        );
    }),

    http.post(`${API_BASE}/locales`, ({ request }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        return readRequestBody<CreateLocaleRequest>(request).then((body) => {
            if (!body.tag || findLanguage(body.tag))
                return toMockJsonResponse(
                    createErrorEnvelope(409, 'CONFLICT', `Language "${body.tag}" already exists`),
                    { status: 409, schema: MockErrorResponse }
                );
            const created: Language = {
                id: `language-${body.tag}`,
                tag: body.tag,
                baseLanguage: body.tag.slice(0, 2),
                name: body.name ?? '',
                nativeName: body.nativeName ?? '',
                direction: body.direction ?? 'ltr',
                active: body.active ?? true,
                revision: 0,
                createdAt: getIsoDateNow(),
                updatedAt: getIsoDateNow()
            };
            languages().push(created);
            return toMockJsonResponse(createSuccessEnvelope(created), {
                status: 201,
                schema: CreateLocaleResponse
            });
        });
    }),

    http.put(`${API_BASE}/locales/:locale`, ({ request, params }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        return readRequestBody<UpdateLocaleRequest>(request).then((body) => {
            const language = findLanguage(String(params.locale));
            if (!language) return notFound();
            if (body.name !== undefined) language.name = body.name;
            if (body.nativeName !== undefined) language.nativeName = body.nativeName;
            if (body.direction !== undefined) language.direction = body.direction;
            if (body.active !== undefined) language.active = body.active;
            language.revision += 1;
            language.updatedAt = getIsoDateNow();
            return toMockJsonResponse(createSuccessEnvelope(language), {
                schema: UpdateLocaleResponse
            });
        });
    }),

    http.delete(`${API_BASE}/locales/:locale`, ({ params }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        const language = findLanguage(String(params.locale));
        if (!language) return notFound();
        // The mis-click guard: destroying a day's translation work must cost a toggle first.
        if (language.active)
            return toMockJsonResponse(
                createErrorEnvelope(409, 'CONFLICT', 'Deactivate the language before deleting it'),
                { status: 409, schema: MockErrorResponse }
            );
        mockDatabase.sampleLanguages = languages().filter(({ tag }) => tag !== language.tag);
        mockDatabase.sampleLocaleEntries = entries().filter(
            ({ locale }) => locale !== language.tag
        );
        return toMockJsonResponse(createSuccessEnvelope(createMessageResponse('Deleted')), {
            schema: DeleteLocaleResponse
        });
    }),

    http.get(`${API_BASE}/locales/:locale/entries`, ({ request, params }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        const language = findLanguage(String(params.locale));
        if (!language) return notFound();
        const query = getQueryParameters(request.url);
        const page = toNumberOrDefault(query.page, 1);
        const pageSize = toNumberOrDefault(query.pageSize, 25);
        const text = typeof query.text === 'string' ? query.text.toLowerCase() : undefined;
        const scope = query.scope === 'app' || query.scope === 'api' ? query.scope : undefined;
        // `text` searches keys and values together, per the contract.
        const matching = entriesOf(language.tag, scope).filter(
            (entry) =>
                !text ||
                entry.key.toLowerCase().includes(text) ||
                entry.value.toLowerCase().includes(text)
        );
        return toMockJsonResponse(
            createSuccessEnvelope({
                items: slicePaginatedData(matching, page, pageSize),
                meta: toPaginationMeta(matching.length, page, pageSize)
            }),
            { schema: ListLocaleEntriesResponse }
        );
    }),

    http.post(`${API_BASE}/locales/:locale/entries`, ({ request, params }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        return readRequestBody<CreateLocaleEntryRequest>(request).then((body) => {
            const language = findLanguage(String(params.locale));
            if (!language || !body.scope || !body.key) return notFound();
            const collision = findCollision(language.tag, body.scope, body.key);
            // Named BOTH ways, like the real 409: the refused key and what it collided with.
            if (collision)
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'CONFLICT',
                        `Key "${body.key}" collides with existing key "${collision.key}"`
                    ),
                    { status: 409, schema: MockErrorResponse }
                );
            const created: LocaleEntry = {
                id: `locale-entry-${++mockEntryIdCounter}`,
                locale: language.tag,
                scope: body.scope,
                key: body.key,
                value: body.value ?? '',
                createdAt: getIsoDateNow(),
                updatedAt: getIsoDateNow()
            };
            entries().push(created);
            language.revision += 1;
            return toMockJsonResponse(createSuccessEnvelope(created), {
                status: 201,
                schema: CreateLocaleEntryResponse
            });
        });
    }),

    // Replace: the scope becomes exactly what the body carries. What is not sent is deleted.
    http.put(`${API_BASE}/locales/:locale/entries`, ({ request, params }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        return readRequestBody<ReplaceLocaleEntriesRequest>(request).then((body) => {
            const language = findLanguage(String(params.locale));
            if (!language || !body.scope) return notFound();
            const previous = entriesOf(language.tag, body.scope);
            const sent = body.entries ?? [];
            const sentKeys = new Set(sent.map(({ key }) => key));
            const previousByKey = new Map(previous.map((entry) => [entry.key, entry]));
            mockDatabase.sampleLocaleEntries = entries().filter(
                (entry) => entry.locale !== language.tag || entry.scope !== body.scope
            );
            upsertEntries(language.tag, body.scope, sent);
            language.revision += 1;
            return toMockJsonResponse(
                createSuccessEnvelope({
                    created: sent.filter(({ key }) => !previousByKey.has(key)).length,
                    updated: sent.filter(({ key }) => previousByKey.has(key)).length,
                    removed: previous.filter(({ key }) => !sentKeys.has(key)).length,
                    revision: language.revision
                }),
                { schema: ReplaceLocaleEntriesResponse }
            );
        });
    }),

    // Merge: what is sent is upserted, everything else is left alone. `removed` is always 0.
    http.patch(`${API_BASE}/locales/:locale/entries`, ({ request, params }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        return readRequestBody<MergeLocaleEntriesRequest>(request).then((body) => {
            const language = findLanguage(String(params.locale));
            if (!language || !body.scope) return notFound();
            const previousKeys = new Set(entriesOf(language.tag, body.scope).map(({ key }) => key));
            const sent = body.entries ?? [];
            upsertEntries(language.tag, body.scope, sent);
            language.revision += 1;
            return toMockJsonResponse(
                createSuccessEnvelope({
                    created: sent.filter(({ key }) => !previousKeys.has(key)).length,
                    updated: sent.filter(({ key }) => previousKeys.has(key)).length,
                    removed: 0,
                    revision: language.revision
                }),
                { schema: MergeLocaleEntriesResponse }
            );
        });
    }),

    http.put(`${API_BASE}/locales/:locale/entries/:entryId`, ({ request, params }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        return readRequestBody<{ value?: string }>(request).then((body) => {
            const language = findLanguage(String(params.locale));
            const entry = entries().find(
                ({ id, locale }) => id === String(params.entryId) && locale === language?.tag
            );
            if (!language || !entry) return notFound();
            entry.value = body.value ?? '';
            entry.updatedAt = getIsoDateNow();
            language.revision += 1;
            return toMockJsonResponse(createSuccessEnvelope(entry), {
                schema: UpdateLocaleEntryResponse
            });
        });
    }),

    http.delete(`${API_BASE}/locales/:locale/entries/:entryId`, ({ params }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        const language = findLanguage(String(params.locale));
        const entry = entries().find(
            ({ id, locale }) => id === String(params.entryId) && locale === language?.tag
        );
        if (!language || !entry) return notFound();
        mockDatabase.sampleLocaleEntries = entries().filter(({ id }) => id !== entry.id);
        language.revision += 1;
        return toMockJsonResponse(createSuccessEnvelope(createMessageResponse('Deleted')), {
            schema: DeleteLocaleEntryResponse
        });
    })
];

/** Insert-or-update each sent row in place, preserving ids and creation dates on updates. */
const upsertEntries = (tag: string, scope: LocaleScope, sent: LocaleEntryInput[]): void => {
    for (const { key, value } of sent) {
        const existing = entries().find(
            (entry) => entry.locale === tag && entry.scope === scope && entry.key === key
        );
        if (existing) {
            existing.value = value;
            existing.updatedAt = getIsoDateNow();
            continue;
        }
        entries().push({
            id: `locale-entry-${++mockEntryIdCounter}`,
            locale: tag,
            scope,
            key,
            value,
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        });
    }
};
