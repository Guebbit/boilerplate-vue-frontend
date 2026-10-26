/**
 * @module
 * The paging every staff payments tab shares: a fixed page size, the 1-based page, the page count
 * from the store's total, and one `load` that reads the current page on mount and on every page
 * change. A failed read is ambient — the table just did not refresh — so it becomes a toast here,
 * once, rather than in each tab.
 */
import { computed, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * Rows per page, on every tab.
 */
export const PAYMENTS_TABLE_PAGE_SIZE = 10;

/**
 * What a tab gets back.
 */
export interface PagedTable {
    /** The page shown, 1-based; bound to the pager. */
    page: Ref<number>;
    /** How many pages the store's total spans. */
    pageTotal: Ref<number>;
    /** Reads the current page; a failure is toasted, never rethrown. */
    load: () => Promise<unknown>;
}

/**
 * Wires a tab's paging to its store read.
 *
 * @param total - The store's row total for this tab.
 * @param fetchPage - The store read for one page.
 * @returns The page, the page count and the load call.
 */
export const usePagedTable = (
    total: Ref<number>,
    fetchPage: (page: number, pageSize: number) => Promise<unknown>
): PagedTable => {
    /**
     * Toast dispatcher for a failed read.
     */
    const { addMessage } = useNotificationsStore();

    /**
     * The page shown, 1-based.
     */
    const page = ref(1);

    /**
     * Page count for the pager.
     */
    const pageTotal = computed(() => Math.ceil(total.value / PAYMENTS_TABLE_PAGE_SIZE));

    /**
     * Reads the current page.
     *
     * @returns A promise resolving once the read settles, failure included.
     */
    const load = () =>
        fetchPage(page.value, PAYMENTS_TABLE_PAGE_SIZE).catch((error: unknown) =>
            notifyErrorMessages(addMessage, error)
        );

    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- load records or toasts its own failure
    watch(page, () => void load());

    onMounted(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- load records or toasts its own failure
        void load();
    });

    return { page, pageTotal, load };
};
