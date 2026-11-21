/**
 * @module
 * `useWatchAvailability`: availability is read when the ids on screen change, and again when the
 * shopper comes back to the tab; it stops listening with the component, and a failed read neither
 * throws nor wipes what is on screen.
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import { listProductAvailability } from '@api';
import { useWatchAvailability } from '../composables/use-watch-availability';
import { availabilityOf, clearAvailability } from '@/kernel/availability.ts';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    listProductAvailability: vi.fn()
}));

/** The ids the probe component is showing; a case changes it like a page change would. */
const shown = ref<string[]>(['a']);

/** The ids on screen, as the composable reads them. */
const shownIds = () => shown.value;

/** What the host renders: nothing worth reading. */
const renderNothing = () => h('div');

/** Every host mounted by a case, so none keeps listening to the window into the next one. */
const hosts: VueWrapper[] = [];

/**
 * A component that only hosts the composable.
 *
 * @param staleTime - The freshness the host asks for.
 */
const mountHost = (staleTime: number) => {
    const wrapper = mount(
        defineComponent({
            setup() {
                useWatchAvailability(shownIds, staleTime);
                return renderNothing;
            }
        })
    );
    hosts.push(wrapper);
    return wrapper;
};

afterEach(() => {
    for (const host of hosts.splice(0)) host.unmount();
});

beforeEach(() => {
    setActivePinia(createPinia());
    clearAvailability();
    shown.value = ['a'];
    vi.mocked(listProductAvailability).mockReset();
    vi.mocked(listProductAvailability).mockImplementation((parameters) =>
        Promise.resolve({
            items: (parameters?.id ?? []).map((productId) => ({
                productId,
                availability: 'in_stock' as const
            }))
        })
    );
});

describe('useWatchAvailability', () => {
    it('reads the ids on screen as soon as the host mounts', async () => {
        mountHost(0);
        await flushPromises();

        expect(listProductAvailability).toHaveBeenCalledWith({ id: ['a'] });
        expect(availabilityOf('a')?.availability).toBe('in_stock');
    });

    it('reads the new ids when the page changes', async () => {
        mountHost(0);
        await flushPromises();

        shown.value = ['b'];
        await nextTick();

        expect(listProductAvailability).toHaveBeenLastCalledWith({ id: ['b'] });
    });

    it('reads again when the window gets focus, for a host that allows no age', async () => {
        mountHost(0);
        await flushPromises();
        vi.mocked(listProductAvailability).mockClear();

        dispatchEvent(new Event('focus'));
        await flushPromises();

        expect(listProductAvailability).toHaveBeenCalledTimes(1);
    });

    it('reads again when the tab becomes visible, and not when it is hidden', async () => {
        mountHost(0);
        await flushPromises();
        vi.mocked(listProductAvailability).mockClear();
        const state = vi.spyOn(document, 'visibilityState', 'get');

        state.mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        await flushPromises();
        expect(listProductAvailability).not.toHaveBeenCalled();

        state.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        await flushPromises();
        expect(listProductAvailability).toHaveBeenCalledTimes(1);
    });

    it('leaves a fresh answer alone when the host allows an age', async () => {
        mountHost(30_000);
        await flushPromises();
        vi.mocked(listProductAvailability).mockClear();

        dispatchEvent(new Event('focus'));
        await flushPromises();

        expect(listProductAvailability).not.toHaveBeenCalled();
    });

    it('stops listening when the host goes away', async () => {
        const wrapper = mountHost(0);
        await flushPromises();
        wrapper.unmount();
        vi.mocked(listProductAvailability).mockClear();

        dispatchEvent(new Event('focus'));
        await flushPromises();

        expect(listProductAvailability).not.toHaveBeenCalled();
    });

    it('keeps what is on screen when a read fails, without throwing', async () => {
        mountHost(0);
        await flushPromises();
        vi.mocked(listProductAvailability).mockRejectedValue(new Error('network down'));

        dispatchEvent(new Event('focus'));
        await flushPromises();

        expect(availabilityOf('a')?.availability).toBe('in_stock');
    });

    it('forgets what it knew and reads again when another person takes over', async () => {
        const session = useSessionStore();
        session.viewer = { id: 'u1', email: 'a@example.com', role: 'admin' };
        mountHost(0);
        await flushPromises();
        vi.mocked(listProductAvailability).mockClear();
        vi.mocked(listProductAvailability).mockResolvedValue({ items: [] });

        session.viewer = { id: 'u2', email: 'b@example.com', role: 'customer' };
        await flushPromises();

        expect(listProductAvailability).toHaveBeenCalledWith({ id: ['a'] });
        // The guest's read answered nothing for it: left out, not the admin's old answer.
        expect(availabilityOf('a')).toBeUndefined();
    });
});
