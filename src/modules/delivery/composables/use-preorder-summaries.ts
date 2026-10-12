/**
 * @module
 * The preorder units of every product by state — the half of the preorder board's product table
 * that lives in `delivery`. A composable rather than the store, so a sibling that renders the
 * table gets the one read it needs and not a second, wider way into this module's writes.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useDeliveryStore } from '../store.ts';

/**
 * Reads the summaries from the delivery store.
 *
 * @returns The summaries, the loading flag, and `load`, which re-reads them all.
 */
export const usePreorderSummaries = () => {
    const store = useDeliveryStore();
    const { preorderSummaries, loading } = storeToRefs(store);
    return {
        summaries: computed(() => preorderSummaries.value),
        loading,
        load: store.fetchPreorderSummaries
    };
};
