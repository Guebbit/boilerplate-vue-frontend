/**
 * @module
 * The kernel's view of the bell: which messages the inbox stamped, and the registry of notices the
 * modules declare. Messages are written into the toolkit's store exactly as the notifications
 * module writes them (persistent, `meta.source: 'inbox'`), so no sibling module is imported.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { noticeOf, registerNotices, useInboxNotices } from '@/kernel/inbox-notices.ts';

/**
 * Puts one row in the toolkit store the way the inbox store does.
 *
 * @param id - The message id.
 * @param code - The row's code.
 * @param readAt - When it was read; absent for unread.
 */
const put = (id: string, code: string, readAt?: string) => {
    useNotificationsStore().addMessage('text', EToastType.PRIMARY, -1, {
        id,
        persistent: true,
        meta: { source: 'inbox', notification: { id, code, readAt } }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('reading the bell from the kernel', () => {
    it('lists only the messages the inbox stamped', () => {
        put('a', 'notifications.staff.task-opened');
        useNotificationsStore().addMessage('other', EToastType.PRIMARY, -1, {
            id: 'x',
            persistent: true,
            meta: {
                source: 'something-else',
                notification: { code: 'notifications.staff.task-opened' }
            }
        });

        expect(effectScope().run(() => useInboxNotices().value.map(({ code }) => code))).toEqual([
            'notifications.staff.task-opened'
        ]);
    });
});

describe('the notice registry', () => {
    it('answers a registered code and nothing else, prototype names included', () => {
        const entry = { describe: () => 'text' };
        registerNotices({ 'notifications.staff.task-opened': entry });

        expect(noticeOf('notifications.staff.task-opened')).toBe(entry);
        expect(noticeOf('notifications.unheard-of')).toBeUndefined();
        expect(noticeOf('toString')).toBeUndefined();
    });
});
