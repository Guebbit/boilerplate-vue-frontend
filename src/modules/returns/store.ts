/**
 * @module
 * Pinia store for the returns module: a paginated search and a by-id read on
 * `useStructureCrudApi`, plus hand-written actions for the endpoints that are moves rather than
 * record edits — open (the withdrawal button), approve, decline, receive.
 */
import { defineStore } from 'pinia';
import { useStructureCrudApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { useIdempotencyKey } from '@/infrastructure/http/idempotency.ts';
import {
    approveReturn,
    createReturn,
    declineReturn,
    getReturnById,
    listReturns,
    receiveReturn
} from '@api';
import type { CreateReturnRequest, ListReturnsParams, Return, ReceiveReturnRequest } from '@types';

/**
 * Search criteria for the list, i.e. everything but pagination (owned by the toolkit's search
 * state).
 */
type ReturnsFilters = Omit<ListReturnsParams, 'page' | 'pageSize'>;

/**
 * Returns and the withdrawal button.
 *
 * Which move is open on a return is the server's `actions`, never derived here — the same rule
 * `orders` follows for its own buttons.
 */
export const useReturnsStore = defineStore('returns', () => {
    /**
     * Record cache, list/pagination state and the read actions, from the toolkit's structured-CRUD
     * primitive. No `create`/`update`/`remove`: opening is not a plain record insert (a withdrawal
     * before dispatch also cancels the order), and the moves go through `updateTarget` below.
     */
    const {
        itemDictionary: returns,
        itemList: returnsList,
        selectedRecord: currentReturn,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        fetchPage: fetchPaginationReturns,
        watchList: watchSearchReturns,
        fetchOne: fetchReturn,
        watchOne: watchReturn,
        updateTarget,
        fetchAny,
        addRecord: addReturn
    } = useStructureCrudApi<Return, string, ReturnsFilters, never, never>(
        {
            search: (filters, page, pageSize) =>
                listReturns({
                    page,
                    pageSize,
                    orderId: filters.orderId,
                    status: filters.status,
                    reason: filters.reason
                }).then((response) => ({
                    items: response.data.items,
                    totalItems: response.data.meta.totalItems
                })),

            get: (returnId) => getReturnById(returnId).then((response) => response.data)
        },
        { resourceKey: 'returns', queryClient }
    );

    /**
     * `Idempotency-Key` for `openReturn` — a network error or a 5xx resends the SAME key, so a lost
     * response never opens two returns; any other outcome mints a fresh one.
     */
    const openIdempotencyKey = useIdempotencyKey();

    /**
     * `Idempotency-Key` for `receive` — the move that pays the customer back must not run twice.
     */
    const receiveIdempotencyKey = useIdempotencyKey();

    /**
     * Opens a return, or withdraws from the contract — one call behind `POST /returns`, which always
     * answers 201 and a `Return`. A withdrawal before dispatch also cancels the order server-side
     * and comes back already `closed`; `orderId` on the result is where to re-read the order from.
     *
     * @param request - The order, the reason, and optionally the lines coming back.
     * @returns A promise resolving with the return that was written (cached here); `undefined` only
     *   when the toolkit's read wrapper handed back no response.
     */
    const openReturn = (request: CreateReturnRequest): Promise<Return | undefined> =>
        fetchAny(() =>
            createReturn(request, openIdempotencyKey.withKey())
                .then((response) => {
                    openIdempotencyKey.settle();
                    return response;
                })
                .catch((error: unknown) => {
                    openIdempotencyKey.settle(error);
                    throw error;
                })
        ).then((response) => {
            const created = response?.data;
            if (created) addReturn(created);
            return created;
        });

    /**
     * Reads every return opened on one order — how an order page shows what became of a
     * withdrawal. Cached like any other read, but outside the paginated list: the list page keeps
     * its own filters, and this must not disturb them.
     *
     * @param orderId - The order whose returns to read.
     * @returns A promise resolving with that order's returns, newest first as the API serves them.
     */
    const fetchOrderReturns = (orderId: string): Promise<Return[]> =>
        fetchAny(() => listReturns({ orderId, pageSize: 50 })).then((response) => {
            const items = response?.data.items ?? [];
            for (const item of items) addReturn(item);
            return items;
        });

    /**
     * Staff accept a requested return. The returned record replaces the cached one.
     *
     * @param returnId - Which return.
     * @returns A promise resolving with the approved return.
     */
    const approve = (returnId: string) =>
        updateTarget(() => approveReturn(returnId).then((response) => response.data), {}, returnId);

    /**
     * Staff refuse a requested return, saying why — the customer is mailed the reason.
     *
     * @param returnId - Which return.
     * @param reason - What the customer is told.
     * @returns A promise resolving with the declined return.
     */
    const decline = (returnId: string, reason: string) =>
        updateTarget(
            () => declineReturn(returnId, { reason }).then((response) => response.data),
            {},
            returnId
        );

    /**
     * Records that the goods arrived: they go back on sale and the customer is paid back. Step-up
     * gated, so the http layer may prompt for the password before this resolves.
     *
     * @param returnId - Which return.
     * @param body - Optionally the handling damage to keep back from the refund.
     * @returns A promise resolving with the return as it now stands.
     */
    const receive = (returnId: string, body?: ReceiveReturnRequest) =>
        updateTarget(
            () =>
                receiveReturn(returnId, body, receiveIdempotencyKey.withKey())
                    .then((response) => {
                        receiveIdempotencyKey.settle();
                        return response.data;
                    })
                    .catch((error: unknown) => {
                        receiveIdempotencyKey.settle(error);
                        throw error;
                    }),
            {},
            returnId
        );

    return {
        returns,
        returnsList,
        currentReturn,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        fetchPaginationReturns,
        watchSearchReturns,
        fetchReturn,
        watchReturn,
        openReturn,
        fetchOrderReturns,
        approve,
        decline,
        receive
    };
});
