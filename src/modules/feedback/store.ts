/**
 * @module
 * Pinia store for the feedback module: a public submit action plus the admin's inbox — whole-list
 * or filtered by search — and its status-update/delete actions, built on the toolkit's
 * `useStructureRestApi` for shared loading-flag plumbing.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    createFeedbackRequest,
    deleteFeedbackRequest,
    searchFeedbackRequests,
    updateFeedbackRequestStatus
} from '@api';
import type { SearchFeedbackRequestsRequest } from '@api';
import type {
    CreateFeedbackRequest,
    FeedbackRequest,
    FeedbackRequestsResponseEnvelope,
    FeedbackRequestStatus
} from '@types';

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
        loadingKey: 'feedback',
        getLoading,
        setLoading
    });

    /**
     * The admin inbox — whole-list state; the inbox is only ever read as a page.
     */
    const requests = ref<FeedbackRequest[]>([]);

    /**
     * The filters behind the currently-shown list, or `undefined` for the unfiltered whole list.
     * Kept so a reload after {@link updateStatus} or {@link deleteRequest} repeats whatever the
     * operator is looking at rather than snapping back to the full inbox underneath them.
     */
    const activeFilters = ref<SearchFeedbackRequestsRequest>();

    /**
     * Applies a list/search response's rows to the inbox state.
     *
     * @param response - Either endpoint's envelope; both answer the same shape.
     * @returns The rows just applied.
     */
    const applyRequests = (response: FeedbackRequestsResponseEnvelope) => {
        requests.value = response.data.items;
        return requests.value;
    };

    /**
     * Reloads the inbox exactly as it is currently filtered — the shared tail of
     * {@link fetchRequests}, {@link searchRequests}, {@link updateStatus} and
     * {@link deleteRequest}, so a write's aftermath never overwrites the operator's own filters.
     *
     * @returns A promise resolving with the reloaded rows.
     */
    const reload = () => searchFeedbackRequests(activeFilters.value ?? {}).then(applyRequests);

    /**
     * Submits the public contact form.
     *
     * @param message - Name (optional), email, subject and message.
     * @returns A promise resolving once the API accepts it.
     */
    const submitContact = (message: CreateFeedbackRequest) =>
        fetchAny(() => createFeedbackRequest(message));

    /**
     * Loads the whole inbox (admin), through `POST /feedback/search` with no filters.
     *
     * Not `GET /feedback`: that answers `Cache-Control: private, max-age=30` (see `searchCache` on
     * the BE), so a re-request inside the window is a BROWSER cache hit — no network call, and a
     * delete answering `200` followed by a reload handing back the row it just removed. A POST is
     * never browser-cached, and it needs no cache-busting query param the contract does not declare
     * (the API refuses one with 422).
     *
     * @returns A promise resolving with the tickets.
     */
    const fetchRequests = () => {
        activeFilters.value = undefined;
        return fetchAny(reload);
    };

    /**
     * Searches the inbox by any combination of status, text and email, through
     * `POST /feedback/search` — the same endpoint {@link fetchRequests} uses, with filters.
     *
     * @param filters - Any combination of `page`, `pageSize`, `text`, `status`, `email`.
     * @returns A promise resolving with the matching tickets.
     */
    const searchRequests = (filters: SearchFeedbackRequestsRequest) => {
        activeFilters.value = filters;
        return fetchAny(() => searchFeedbackRequests(filters).then(applyRequests));
    };

    /**
     * Moves one ticket to a new status (admin) and reloads the inbox — the row worth rendering
     * afterwards is the API's, not a local guess.
     *
     * @param requestId - Which ticket.
     * @param status - Its next status.
     * @returns A promise resolving with the refreshed inbox.
     */
    const updateStatus = (requestId: string, status: FeedbackRequestStatus) =>
        fetchAny(() => updateFeedbackRequestStatus(requestId, { status }).then(() => reload()));

    /**
     * Permanently removes one ticket (admin) and reloads the inbox — the same reload rule as
     * {@link updateStatus}: the list worth rendering afterwards is the API's, not a local guess.
     *
     * @param requestId - Which ticket.
     * @returns A promise resolving with the refreshed inbox.
     */
    const deleteRequest = (requestId: string) =>
        fetchAny(() => deleteFeedbackRequest(requestId).then(() => reload()));

    return {
        requests,
        activeFilters,

        loading,
        submitContact,
        fetchRequests,
        searchRequests,
        updateStatus,
        deleteRequest
    };
});
