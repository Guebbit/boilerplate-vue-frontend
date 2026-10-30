/**
 * @module
 * The kernel's view of the bell, and the nav badges built on it: which unread work notices each
 * admin entry counts. Messages are written into the toolkit's store exactly as the notifications
 * module writes them (persistent, `meta.source: 'inbox'`), so no sibling module is imported.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import type { Ref } from 'vue';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { useInboxNotices, useUnreadNoticeCount } from '@/kernel/inbox-notices.ts';
import type { AppModule } from '@/kernel/registry';
import inventoryModule from '@/modules/inventory/module.ts';
import ordersModule from '@/modules/orders/module.ts';
import paymentsModule from '@/modules/payments/module.ts';
import returnsModule from '@/modules/returns/module.ts';
import usersModule from '@/modules/users/module.ts';
import webhooksModule from '@/modules/webhooks/module.ts';

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

/**
 * Runs a `badge` accessor in a scope, as the shell does in its setup.
 *
 * @param modules - The manifests to search.
 * @param name - The nav entry's route name.
 * @returns The ref the entry would wear.
 */
const badgeOf = (modules: readonly AppModule[], name: string): Ref<number | undefined> => {
    const entry = modules.flatMap((module) => module.navigation ?? []).find((e) => e.name === name);
    const ref = effectScope().run(() => entry?.badge?.());
    if (!ref) throw new Error(`no badge on ${name}`);
    return ref;
};

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('reading the bell from the kernel', () => {
    it('lists only the messages the inbox stamped', () => {
        put('a', 'notifications.staff.low-stock');
        useNotificationsStore().addMessage('other', EToastType.PRIMARY, -1, {
            id: 'x',
            persistent: true,
            meta: {
                source: 'something-else',
                notification: { code: 'notifications.staff.low-stock' }
            }
        });

        expect(effectScope().run(() => useInboxNotices().value.map(({ code }) => code))).toEqual([
            'notifications.staff.low-stock'
        ]);
    });

    it('counts unread rows of the given codes, and follows a read', () => {
        const count = effectScope().run(() =>
            useUnreadNoticeCount(['notifications.staff.low-stock'])
        )!;
        put('a', 'notifications.staff.low-stock');
        put('b', 'notifications.staff.low-stock', '2026-10-30T10:00:00.000Z');
        put('c', 'notifications.staff.unshipped');

        expect(count.value).toBe(1);

        put('a', 'notifications.staff.low-stock', '2026-10-30T11:00:00.000Z');

        expect(count.value).toBe(0);
    });
});

describe('the admin nav badges', () => {
    /**
     * Entry, the module that declares it, and the codes it must count.
     */
    const MAP: readonly [string, AppModule, readonly string[]][] = [
        ['PaymentsList', paymentsModule, ['stale-refunds']],
        ['UsersList', usersModule, ['purchase-hold-placed']],
        ['WebhooksList', webhooksModule, ['webhook-disabled']],
        ['InventoryLedger', inventoryModule, ['low-stock']],
        ['PreordersBoard', inventoryModule, ['preorders-late']],
        [
            'ReturnsList',
            returnsModule,
            ['return-requested', 'withdrawals-awaiting-goods', 'returns-undecided']
        ],
        [
            'SalesOrders',
            ordersModule,
            [
                'transfers-due',
                'delivery-holds-open',
                'unshipped',
                'awaiting-tracking',
                'undelivered'
            ]
        ]
    ];

    it.each(MAP)('%s counts exactly its own unread codes', (name, module, codes) => {
        const badge = badgeOf([module], name);
        for (const [index, code] of codes.entries())
            put(`own${index}`, `notifications.staff.${code}`);
        put('read', `notifications.staff.${codes[0]}`, '2026-10-30T10:00:00.000Z');
        // Every other entry's codes must stay out of this one's count.
        for (const [other, , otherCodes] of MAP.filter(([n]) => n !== name))
            for (const code of otherCodes)
                if (!codes.includes(code)) put(`${other}-${code}`, `notifications.staff.${code}`);

        expect(badge.value).toBe(codes.length);
    });

    it('ignores a buyer-facing notice', () => {
        const badge = badgeOf([paymentsModule], 'PaymentsList');
        put('own', 'notifications.cart-line-removed');

        expect(badge.value).toBe(0);
    });
});
