/**
 * @module
 * The count the webhooks nav entry wears: subscriptions the failure guard switched off, which only
 * a person can switch back on. Read from the subscriptions list's own total, for a person who may
 * read them, on the shared badge triggers.
 */
import { computed } from 'vue';
import type { Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBadgeRefresh } from '@/kernel/use-badge-refresh.ts';
import { useWebhooksBadgeStore } from '../badge-store';

/**
 * Starts the badge for the shell: call it once, from the nav entry's `badge` accessor.
 *
 * @returns The number to wear, or `undefined` while there is nothing to show.
 */
export const useAutoDisabledBadge = (): Ref<number | undefined> => {
    const store = useWebhooksBadgeStore();
    const session = useSessionStore();
    const { autoDisabledTotal } = storeToRefs(store);

    useBadgeRefresh({
        readerId: computed(() =>
            session.can('read', 'WebhookSubscription') ? session.viewer?.id : undefined
        ),
        read: (forced) => store.loadAutoDisabledTotal(forced),
        clear: () => {
            autoDisabledTotal.value = undefined;
        }
    });

    return autoDisabledTotal;
};
