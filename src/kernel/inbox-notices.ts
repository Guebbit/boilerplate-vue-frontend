/**
 * @module
 * The bell's notices, read by a sibling that must not import the notifications module.
 *
 * The notifications module keeps each server row in a persistent toolkit message's `meta`, stamped
 * `source: 'inbox'`. This reads that stamp and the row's `code` and `readAt`, nothing more, so a
 * nav badge or a counter can follow the inbox with no dependency on the module that fills it.
 */
import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import type { Notification } from '@types';

/**
 * Every code a notification can carry, as the contract names them.
 */
export type NotificationCode = Notification['code'];

/**
 * What a reader of the bell needs from one row.
 */
export interface InboxNotice {
    /**
     * The row's code (`notifications.staff.low-stock`).
     */
    code: string;
    /**
     * When the owner opened the bell past it; absent while unread.
     */
    readAt?: string | undefined;
}

/**
 * The toolkit's persistent messages that the inbox stamped, as plain notices.
 *
 * @returns A reactive list, newest first, empty when the inbox holds nothing.
 */
export const useInboxNotices = (): ComputedRef<InboxNotice[]> => {
    const { persistentMessages } = storeToRefs(useNotificationsStore());

    return computed(() =>
        persistentMessages.value.flatMap(({ meta }) =>
            // The `source` stamp proves the inbox store wrote `meta.notification` as a row.
            meta?.source === 'inbox' ? [meta.notification as InboxNotice] : []
        )
    );
};

/**
 * How many unread notices carry one of the given codes: the number a nav entry wears.
 *
 * @param codes - The codes the entry is about.
 * @returns A reactive count; `0` renders no badge.
 */
export const useUnreadNoticeCount = (codes: readonly NotificationCode[]): ComputedRef<number> => {
    const notices = useInboxNotices();
    const wanted = new Set<string>(codes);

    return computed(
        () =>
            notices.value.filter(({ code, readAt }) => readAt === undefined && wanted.has(code))
                .length
    );
};
