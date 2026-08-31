/**
 * @module
 * Pinia store for the feedback module: a public submit action plus the
 * admin's whole-list inbox and status-update action, built on the toolkit's
 * `useStructureRestApi` for shared loading-flag plumbing.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    createFeedbackRequest,
    deleteFeedbackRequest,
    listFeedbackRequests,
    updateFeedbackRequestStatus
} from '@api';
import type { ListFeedbackRequestsParams } from '@api';
import type { CreateFeedbackRequest, FeedbackRequest, FeedbackRequestStatus } from '@types';

/**
 * The contact form's two audiences: anyone may submit, admins read the inbox and move tickets
 * through their statuses. The BE answered these endpoints since before this module existed —
 * this store is the first frontend code to call them.
 */
export const useFeedbackStore = defineStore('feedback', () => {
    /**
     * Shared per-key loading flags, keyed internally by this store's name.
     */
    const { getLoading, setLoading } = useCoreStore();

    /**
     * The toolkit's generic loading/fetch wrapper — this store's actions are hand-written, so this is all it takes from it.
     */
    const { loading, fetchAny } = useStructureRestApi<FeedbackRequest, string>({
        getLoading,
        setLoading
    });

    /**
     * The admin inbox — whole-list state; the inbox is only ever read as a page.
     */
    const requests = ref<FeedbackRequest[]>([]);

    /**
     * Submits the public contact form.
     *
     * @param message - Name (optional), email, subject and message.
     * @returns A promise resolving once the API accepts it.
     */
    const submitContact = (message: CreateFeedbackRequest) =>
        fetchAny(() => createFeedbackRequest(message));

    /**
     * Loads the inbox (admin).
     *
     * `_` is a cache-busting query param, not a documented filter — this endpoint answers with
     * `Cache-Control: private, max-age=30` (see `searchCache` on the BE), so a plain re-request
     * inside that window is a BROWSER HTTP CACHE HIT: no network call at all, invisible to the
     * server's own cache invalidation, and indistinguishable from a real answer. `updateStatus`
     * and `deleteRequest` both reload right after a write that changes this very list, which is
     * exactly the case that window bites — a delete answering `200` and a reload immediately
     * handing back the row it just removed. A `Cache-Control: no-cache` REQUEST header would say
     * the same thing without touching the URL, but it is not one of the `cors` package's allowed
     * request headers, so it 500s on the CORS PREFLIGHT and drops the request before it leaves
     * the browser — one more reason a query param, not a header, is what forces this.
     *
     * @returns A promise resolving with the tickets.
     */
    const fetchRequests = () =>
        fetchAny(() =>
            listFeedbackRequests({ _: Date.now() } as ListFeedbackRequestsParams).then(
                (response) => {
                    requests.value = response.data.items;
                    return requests.value;
                }
            )
        );

    /**
     * Moves one ticket to a new status (admin) and reloads the inbox — the row worth rendering
     * afterwards is the API's, not a local guess.
     *
     * @param requestId - Which ticket.
     * @param status - Its next status.
     * @returns A promise resolving with the refreshed inbox.
     */
    const updateStatus = (requestId: string, status: FeedbackRequestStatus) =>
        fetchAny(() =>
            updateFeedbackRequestStatus(requestId, { status }).then(() => fetchRequests())
        );

    /**
     * Permanently removes one ticket (admin) and reloads the inbox — the same reload rule as
     * {@link updateStatus}: the list worth rendering afterwards is the API's, not a local guess.
     *
     * @param requestId - Which ticket.
     * @returns A promise resolving with the refreshed inbox.
     */
    const deleteRequest = (requestId: string) =>
        fetchAny(() => deleteFeedbackRequest(requestId).then(() => fetchRequests()));

    return {
        requests,

        loading,
        submitContact,
        fetchRequests,
        updateStatus,
        deleteRequest
    };
});
