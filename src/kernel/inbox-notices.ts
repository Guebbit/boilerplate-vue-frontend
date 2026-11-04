/**
 * @module
 * The bell's notices, read by a sibling that must not import the notifications module, and the
 * registry of how each code is worded and linked.
 *
 * The notifications module keeps each server row in a persistent toolkit message's `meta`, stamped
 * `source: 'inbox'`. This reads that stamp and the row's `code` and `readAt`, nothing more, so a
 * counter can follow the inbox with no dependency on the module that fills it. The modules'
 * `notices` are installed here once at boot, the way locale loaders are installed in `@/i18n`.
 */
import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import type { AppNotice } from '@/kernel/registry';

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
 * Every enabled module's notices, by code. Installed by the composition root because the kernel
 * may not import `@/modules`.
 */
let registeredNotices: Record<string, AppNotice> = {};

/**
 * Install the enabled modules' notices. Replaces rather than appends. Must run before the first
 * notice is described; skip it and every notice reads as a generic one linking nowhere.
 *
 * @param notices - code to entry, from `collectModuleNotices`
 */
export const registerNotices = (notices: Record<string, AppNotice>): void => {
    registeredNotices = notices;
};

/**
 * The entry a module declared for a code.
 *
 * @param code - The notification's code.
 * @returns The entry, or `undefined` for a code no enabled module declares (a newer backend).
 */
export const noticeOf = (code: string): AppNotice | undefined =>
    Object.hasOwn(registeredNotices, code) ? registeredNotices[code] : undefined;
