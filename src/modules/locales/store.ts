import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureCrudApi } from '@guebbit/vue-toolkit';
import {
    getLocales,
    createLocale,
    updateLocale as apiUpdateLocale,
    deleteLocale,
    listLocaleEntries,
    createLocaleEntry,
    updateLocaleEntry,
    deleteLocaleEntry,
    replaceLocaleEntries,
    mergeLocaleEntries
} from '@api';
import type {
    LocaleCapability,
    LocaleEntry,
    LocaleScope,
    CreateLocaleRequest,
    UpdateLocaleRequest,
    CreateLocaleEntryRequest,
    LocaleEntryInput,
    LocaleImportResult
} from '@types';

/**
 * Search criteria for one language's entries.
 *
 * `tag` is in here rather than in a separate ref ON PURPOSE: the toolkit keys its search cache on
 * the filters object, so a tag outside it would let two languages with the same text filter serve
 * each other's cached pages. Inside it, switching language is just another filter change.
 */
export interface LocaleEntriesFilters {
    tag?: string;
    text?: string;
    scope?: LocaleScope;
}

/**
 * The translation admin surface: languages on one side, one language's entries on the other.
 *
 * Two halves rather than one CRUD resource because the API answers with two different records:
 * `getLocales` serves `LocaleCapability` — the merged manifest of both tiers — while the writes
 * answer with `Language`, the dynamic-tier row alone. The manifest is what the board renders, so
 * every write refetches it rather than trying to splice a `Language` into a list it is not shaped
 * like.
 *
 * The entries half is the ordinary paginated resource the users and products stores are, and uses
 * the same toolkit surface. Only the writes differ: every operation needs the language tag as
 * well as the row id, so they are explicit wrappers rather than the generic `createOne` family.
 *
 * Nothing here touches the RUNNING app's dictionaries. Reloading what the visitor is looking at
 * after an edit is the view's business — see `applyLiveOverrides` in `LocaleEntries.vue` — because
 * a store that reached into `i18n` would couple every import of this module to boot order.
 */
export const useLocalesStore = defineStore('locales', () => {
    const { getLoading, setLoading } = useCoreStore();

    const {
        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        watchList: watchSearchEntries,
        addRecord,
        deleteTarget,
        resetSearches,
        fetchAny
    } = useStructureCrudApi<LocaleEntry, string, LocaleEntriesFilters>(
        {
            search: (searchFilters, page, size) =>
                listLocaleEntries(searchFilters.tag ?? '', {
                    page,
                    pageSize: size,
                    text: searchFilters.text,
                    scope: searchFilters.scope
                }).then((response) => response.data.items)
        },
        { getLoading, setLoading }
    );

    /** The manifest: every language, both tiers merged, as last fetched. */
    const capabilities = ref<LocaleCapability[]>([]);

    /** The deployment's default language, from the manifest. */
    const defaultLocale = ref<string>();

    /** The deployment's fallback language, from the manifest. */
    const fallbackLocale = ref<string>();

    /**
     * Loads the language manifest.
     *
     * @returns A promise resolving with the capabilities.
     */
    const fetchLanguages = () =>
        fetchAny(() =>
            getLocales().then((response) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the generated envelope types promise `data`; the wire does not, and the store spec pins "a bare payload is empty, not a crash"
                capabilities.value = response.data?.locales ?? [];
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the generated envelope types promise `data`; the wire does not, and the store spec pins "a bare payload is empty, not a crash"
                defaultLocale.value = response.data?.default;
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the generated envelope types promise `data`; the wire does not, and the store spec pins "a bare payload is empty, not a crash"
                fallbackLocale.value = response.data?.fallback;
                return capabilities.value;
            })
        );

    /**
     * Registers a language in the dynamic tier, then reloads the manifest.
     *
     * @param body - Tag, names, direction and visibility of the new language.
     * @returns A promise resolving with the created `Language` row.
     */
    const createLanguage = (body: CreateLocaleRequest) =>
        fetchAny(() =>
            createLocale(body).then((response) => fetchLanguages().then(() => response.data))
        );

    /**
     * Edits a language's display names, direction or visibility, then reloads the manifest.
     *
     * The tag is not editable — it is what every entry references.
     *
     * @param tag - Which language.
     * @param body - The fields to change; an omitted field is left alone.
     * @returns A promise resolving with the updated `Language` row.
     */
    const editLanguage = (tag: string, body: UpdateLocaleRequest) =>
        fetchAny(() =>
            apiUpdateLocale(tag, body).then((response) =>
                fetchLanguages().then(() => response.data)
            )
        );

    /**
     * Removes a language and every entry translated into it, then reloads the manifest.
     *
     * The API refuses with 409 while the language is still active — deactivate first. That
     * two-step is the server's guard rail, not this store's to soften.
     *
     * @param tag - Which language.
     * @returns A promise resolving once the manifest agrees the language is gone.
     */
    const removeLanguage = (tag: string) =>
        fetchAny(() =>
            deleteLocale(tag)
                .then(() => fetchLanguages())
                .then(() => undefined)
        );

    /**
     * Adds one translation entry.
     *
     * A 409 carries the server's explanation of the key collision — both keys, named — and is
     * rethrown untouched so the view can show it verbatim.
     *
     * @param tag - Which language.
     * @param body - Scope, key and value of the new row.
     * @returns A promise resolving with the created entry.
     */
    const addEntry = (tag: string, body: CreateLocaleEntryRequest) =>
        fetchAny(() =>
            createLocaleEntry(tag, body).then((response) => {
                addRecord(response.data);
                // The new row's page position is the server's call, so cached pages are stale.
                resetSearches();
                return response.data;
            })
        );

    /**
     * Updates one entry's value. The key is not editable — changing it is a delete plus an add.
     *
     * @param tag - Which language.
     * @param entryId - Which row.
     * @param value - The new translation.
     * @returns A promise resolving with the updated entry.
     */
    const editEntry = (tag: string, entryId: string, value: string) =>
        fetchAny(() =>
            updateLocaleEntry(tag, entryId, { value }).then((response) => {
                addRecord(response.data);
                return response.data;
            })
        );

    /**
     * Removes one entry from one language. The other languages keep theirs.
     *
     * @param tag - Which language.
     * @param entryId - Which row.
     * @returns A promise resolving once the row is gone locally as well.
     */
    const removeEntry = (tag: string, entryId: string) =>
        deleteTarget(() => deleteLocaleEntry(tag, entryId), entryId);

    /**
     * Bulk import into ONE scope, with the semantics spelled by the method it maps to.
     *
     * `merge` upserts what is sent and deletes nothing; `replace` makes the scope exactly what the
     * body carries — what is not sent is DELETED. The choice lives in the HTTP method on purpose,
     * so this wrapper keeps the two words rather than a boolean someone can pass inverted.
     *
     * @param tag - Which language.
     * @param mode - `merge` or `replace`.
     * @param scope - Which of the two dictionaries the batch belongs to.
     * @param entries - The rows, flat and dotted.
     * @returns A promise resolving with what the import actually did, counted.
     */
    const importEntries = (
        tag: string,
        mode: 'merge' | 'replace',
        scope: LocaleScope,
        entries: LocaleEntryInput[]
    ): Promise<LocaleImportResult | undefined> =>
        fetchAny(() =>
            (mode === 'replace'
                ? replaceLocaleEntries(tag, { scope, entries })
                : mergeLocaleEntries(tag, { scope, entries })
            ).then((response) => {
                // An import rewrote an unknown slice of the table; every cached page is stale.
                resetSearches();
                return response.data;
            })
        );

    /**
     * Every entry of one language, paged to completion — what the export dialog folds back into
     * a nested dictionary.
     *
     * Reads the entries collection rather than `GET /locales/{tag}/messages` deliberately: the
     * messages route serves `app` rows only and 404s for an inactive language, while an export
     * should carry exactly what is stored, both scopes, visible or not.
     *
     * @param tag - Which language.
     * @param scope - Narrow to one dictionary; omitted, both.
     * @returns A promise resolving with every matching row.
     */
    const fetchAllEntries = (tag: string, scope?: LocaleScope) =>
        fetchAny(() => {
            const pageSize = 100;
            const collect = (page: number, soFar: LocaleEntry[]): Promise<LocaleEntry[]> =>
                listLocaleEntries(tag, { page, pageSize, scope }).then((response) => {
                    const items = [...soFar, ...response.data.items];
                    const { totalPages } = response.data.meta;
                    return page < totalPages ? collect(page + 1, items) : items;
                });
            return collect(1, []);
        });

    return {
        capabilities,
        defaultLocale,
        fallbackLocale,
        fetchLanguages,
        createLanguage,
        editLanguage,
        removeLanguage,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        watchSearchEntries,
        addEntry,
        editEntry,
        removeEntry,
        importEntries,
        fetchAllEntries
    };
});
