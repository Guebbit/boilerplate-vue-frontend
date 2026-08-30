/**
 * @module
 * Pinia store for the feedback module: a public submit action plus the
 * admin's whole-list inbox and status-update action, built on the toolkit's
 * `useStructureRestApi` for shared loading-flag plumbing.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { createFeedbackRequest, listFeedbackRequests, updateFeedbackRequestStatus } from '@api';
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
     * @returns A promise resolving with the tickets.
     */
    const fetchRequests = () =>
        fetchAny(() =>
            listFeedbackRequests().then((response) => {
                requests.value = response.data.items;
                return requests.value;
            })
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

    return {
        requests,

        loading,
        submitContact,
        fetchRequests,
        updateStatus
    };
});
