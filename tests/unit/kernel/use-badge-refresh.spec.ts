/**
 * @module
 * When a staff badge re-reads: a viewer and a staff notice force a read, a route change and a
 * returning tab ask a normal one, a hidden tab and a buyer's message ask nothing, sign-out clears,
 * and a failing read keeps the number and tells the person once.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { useBadgeRefresh } from '@/kernel/use-badge-refresh.ts';
import { mountBadge, setVisibility } from '../../support/unit/badge-host.ts';
import { wireModulesIntoCore } from '../../support/unit/wire-modules.ts';

wireModulesIntoCore();

beforeEach(() => {
    setActivePinia(createPinia());
});

/**
 * Starts the triggers for a reader, with a recording read and clear.
 *
 * @param id - who is reading at the start
 */
const start = async (id: string | null = 'u1') => {
    const readerId = ref<string | undefined>(id ?? undefined);
    const read = vi.fn<(forced: boolean) => Promise<unknown>>().mockResolvedValue(undefined);
    const clear = vi.fn();
    const host = await mountBadge(() => {
        useBadgeRefresh({ readerId, read, clear });
    });
    await flushPromises();
    return { ...host, readerId, read, clear };
};

/**
 * Puts one bell row in the toolkit store, as the inbox does.
 *
 * @param id - message id
 * @param code - the row's code
 */
const ring = (id: string, code: string) =>
    useNotificationsStore().addMessage('text', EToastType.PRIMARY, -1, {
        id,
        persistent: true,
        meta: { source: 'inbox', notification: { id, code } }
    });

describe('the badge triggers', () => {
    it('reads once, forced, for the person who is there, and nothing for nobody', async () => {
        const present = await start('u1');
        expect(present.read.mock.calls).toEqual([[true]]);

        const absent = await start(null);
        expect(absent.read).not.toHaveBeenCalled();
    });

    it('reads again, forced, when another person takes the tab over', async () => {
        const { readerId, read } = await start('u1');

        readerId.value = 'u2';
        await flushPromises();

        expect(read.mock.calls).toEqual([[true], [true]]);
    });

    it('clears when the person signs out, and reads nothing', async () => {
        const { readerId, read, clear } = await start('u1');

        readerId.value = undefined;
        await flushPromises();

        expect(clear).toHaveBeenCalledOnce();
        expect(read).toHaveBeenCalledOnce();
    });

    it('asks a normal read on a route change, and none on a route change for nobody', async () => {
        const { router, read } = await start('u1');

        await router.push('/a');
        await flushPromises();
        expect(read.mock.calls).toEqual([[true], [false]]);

        const absent = await start(null);
        await absent.router.push('/a');
        await flushPromises();
        expect(absent.read).not.toHaveBeenCalled();
    });

    it('asks a normal read when the tab becomes visible, and none when it hides', async () => {
        const { read } = await start('u1');

        setVisibility('hidden');
        await flushPromises();
        expect(read).toHaveBeenCalledOnce();

        setVisibility('visible');
        await flushPromises();
        expect(read.mock.calls).toEqual([[true], [false]]);
    });

    it('forces a read for a staff notice and ignores a buyer message', async () => {
        const { read } = await start('u1');

        ring('n1', 'shop-tasks.fulfillment-delayed');
        await nextTick();
        await flushPromises();
        expect(read).toHaveBeenCalledOnce();

        ring('n2', 'shop-tasks.staff.low-stock');
        await nextTick();
        await flushPromises();
        expect(read.mock.calls).toEqual([[true], [true]]);
    });

    it('stops listening once its scope is gone', async () => {
        const { read, wrapper } = await start('u1');

        wrapper.unmount();
        setVisibility('visible');
        await flushPromises();

        expect(read).toHaveBeenCalledOnce();
    });

    it('keeps the number and tells the person once while reads keep failing', async () => {
        const { router, read, readerId } = await start('u1');
        const messages = useNotificationsStore();
        read.mockRejectedValue(new Error('network'));

        await router.push('/a');
        await flushPromises();
        await router.push('/b');
        await flushPromises();

        expect(read).toHaveBeenCalledTimes(3);
        expect(messages.history).toHaveLength(1);
        expect(readerId.value).toBe('u1');
    });
});
