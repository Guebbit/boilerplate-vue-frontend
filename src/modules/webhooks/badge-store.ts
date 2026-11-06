/**
 * @module
 * Pinia store for the webhooks nav badge alone: one count read. Kept apart from `store.ts` because
 * the badge accessor runs in the shell's entry chunk, and the CRUD store (which pulls in the
 * generated schemas) must stay in the webhooks route chunk.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { asPassive } from '@/infrastructure/http/passive.ts';
import { BADGE_FRESH_MS } from '@/kernel/use-badge-refresh.ts';
import { listWebhookSubscriptions } from '@api';
import type { WebhookSubscription } from '@types';

/**
 * Subscriptions the failure guard switched off: the staff badge's count.
 */
export const useWebhooksBadgeStore = defineStore('webhooks-badge', () => {
    /**
     * The toolkit's REST slice, used only for `fetchAny`: the count is not a record.
     */
    const { fetchAny } = useStructureRestApi<WebhookSubscription, string>({
        resourceKey: 'webhooks-badge',
        queryClient
    });

    /**
     * The count the badge wears; `undefined` until read, and after sign-out.
     */
    const autoDisabledTotal = ref<number>();

    /**
     * Reads the count: the total of the list the badge opens. Passive: the app asks, not the person.
     *
     * @param forced - Skip the freshness window.
     * @returns A promise resolving once the count is kept.
     */
    const loadAutoDisabledTotal = (forced = false): Promise<void> =>
        fetchAny(
            // One row is enough: only `meta.totalItems` is read.
            () => listWebhookSubscriptions({ pageSize: 1, autoDisabled: true }, asPassive()),
            { key: ['auto-disabled-total'], staleTime: BADGE_FRESH_MS, forced }
        ).then((page) => {
            if (page) autoDisabledTotal.value = page.meta.totalItems;
        });

    return { autoDisabledTotal, loadAutoDisabledTotal };
});
