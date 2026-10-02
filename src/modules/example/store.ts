/**
 * @module
 * The Pinia store: this domain's state, and every call it makes to the generated client. One
 * `useStructureCrudApi` instance declares the resource (search, get, create, update, remove) and
 * hands back the record cache, the list and pagination state and the actions; two hand-written
 * actions cover what does not fit the generic shape.
 */
import { defineStore } from 'pinia';
import { useStructureCrudApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';
import { queryClient } from '@/infrastructure/query-client.ts';
import { sortTokensOf } from '@/infrastructure/utils/sort.ts';
import {
    listExamples,
    getExampleById,
    getPublishedExample,
    createExample as apiCreateExample,
    updateExampleById,
    deleteExampleById,
    replaceExampleCover,
    ExampleSortItem
} from '@api';
import type { CreateExampleRequest, Example, ExampleStatus, UpdateExampleRequest } from '@types';

/**
 * Search criteria for the list, i.e. everything but pagination (which the toolkit's search state
 * owns). `sort` is the API's JSON:API grammar as one CSV, the form a URL holds.
 */
export interface ExampleFilters {
    text?: string;
    status?: ExampleStatus;
    sort?: string;
}

/**
 * Examples: list, read, create, edit, delete, plus the cover image and the public read.
 *
 * See the users store for the shape this follows: one `defineStore`, `useStructureCrudApi` for the
 * generic reads and writes, hand-written actions beside it for whatever does not fit.
 */
export const useExampleStore = defineStore('example', () => {
    /**
     * Record cache, list and pagination state, and the CRUD actions, generated from the type
     * parameters (entity, id, filters, create body, update body) and the calls below.
     * `resourceKey` is what the layout's loading indicator and the query cache know it by.
     */
    const {
        itemDictionary: examples,
        itemList: examplesList,
        getRecord: getExample,
        addRecord: addExampleRecord,
        editRecord: editExampleRecord,
        selectedIdentifier: selectedExampleId,
        selectedRecord: currentExample,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        fetchOne: fetchExample,
        watchOne: watchExample,
        watchList: watchExamplesSearch,
        createOne: createExample,
        updateOne: updateExample,
        deleteOne: deleteExample,
        fetchAny
    } = useStructureCrudApi<
        Example,
        string,
        ExampleFilters,
        CreateExampleRequest,
        UpdateExampleRequest,
        AxiosRequestConfig
    >(
        {
            search: (searchFilters, page, size) =>
                listExamples({
                    page,
                    pageSize: size,
                    text: searchFilters.text,
                    status: searchFilters.status,
                    sort: sortTokensOf(searchFilters.sort, ExampleSortItem)
                }).then((response) => ({
                    items: response.data.items,
                    totalItems: response.data.meta.totalItems
                })),

            get: (id) => getExampleById(id).then((response) => response.data),

            create: (data, options) =>
                apiCreateExample(data, options).then((response) => response.data),

            // PATCH: the edit form sends the fields it holds, and an omitted one stays as it is.
            update: (id, data = {}, options) =>
                updateExampleById(id, data, options).then((response) => response.data),

            remove: (id) => deleteExampleById(id)
        },
        { resourceKey: 'example', queryClient }
    );

    /**
     * Sets an example's cover image. Hand-written rather than the generic `updateOne`: the cover
     * is its own multipart route, not a field of the JSON body, and its answer is the whole
     * example, which replaces the cached record.
     *
     * @param id - The example to change.
     * @param imageUpload - The picked image.
     * @param options - Request options, e.g. the upload-progress tracker's.
     * @returns The example with its new cover.
     */
    const setCover = (id: string, imageUpload: File, options?: AxiosRequestConfig) =>
        fetchAny(() =>
            replaceExampleCover(id, { imageUpload }, options).then(({ data: updated }) => {
                editExampleRecord(updated, id);
                return updated;
            })
        );

    /**
     * Reads a published example for the public screen. Not cached with the signed-in records: a
     * stranger's read and an owner's list are different answers, and this one needs no session.
     *
     * @param id - The example to read.
     * @returns The published example.
     */
    const fetchPublished = (id: string) =>
        fetchAny(() => getPublishedExample(id).then((response) => response.data));

    return {
        examples,
        examplesList,
        getExample,
        addExampleRecord,
        selectedExampleId,
        currentExample,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        fetchExample,
        watchExample,
        watchExamplesSearch,
        createExample,
        updateExample,
        deleteExample,
        setCover,
        fetchPublished
    };
});
