/**
 * @module
 * `AvailabilityWatcher.vue`, the renderless component a product view renders from the
 * `availability-watch` slot: it reads the availability of the ids it is given, and the shelf count
 * only when asked.
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { getInventoryLevel, listProductAvailability } from '@api';
import { availabilityOf, clearAvailability, stockCountOf } from '@/modules/products';
import { useSessionStore } from '@/infrastructure/session.ts';
import { aLevel } from '../../../../tests/support/unit/fixtures.ts';
import AvailabilityWatcher from '../components/AvailabilityWatcher.vue';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    listProductAvailability: vi.fn(),
    getInventoryLevel: vi.fn()
}));

/** Every watcher mounted by a case. */
const mounted: { unmount: () => void }[] = [];

/**
 * Mounts the watcher.
 *
 * @param props - what the host hands in
 */
const mountWatcher = (props: {
    productIds: string[];
    staleTime: number;
    withStockCount?: boolean;
}) => {
    const wrapper = mount(AvailabilityWatcher, { props });
    mounted.push(wrapper);
    return wrapper;
};

beforeEach(() => {
    setActivePinia(createPinia());
    clearAvailability();
    vi.spyOn(useSessionStore(), 'can').mockReturnValue(true);
    vi.mocked(listProductAvailability).mockReset();
    vi.mocked(listProductAvailability).mockResolvedValue({
        items: [{ productId: 'p1', availability: 'preorder', availabilityDate: '2027-03-15' }]
    });
    vi.mocked(getInventoryLevel).mockReset();
    vi.mocked(getInventoryLevel).mockResolvedValue(aLevel({ productId: 'p1', available: 4 }));
});

afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

describe('AvailabilityWatcher', () => {
    it('reads the availability of its ids into the kernel port, and renders nothing visible', async () => {
        const wrapper = mountWatcher({ productIds: ['p1'], staleTime: 0 });
        await flushPromises();

        expect(listProductAvailability).toHaveBeenCalledWith({ id: ['p1'] });
        expect(availabilityOf('p1')?.availability).toBe('preorder');
        expect(wrapper.text()).toBe('');
    });

    it('leaves the shelf count alone unless the host asks for it', async () => {
        mountWatcher({ productIds: ['p1'], staleTime: 0 });
        await flushPromises();

        expect(getInventoryLevel).not.toHaveBeenCalled();
        expect(stockCountOf('p1')).toBeUndefined();
    });

    it('reads the shelf count when the host asks and the viewer may', async () => {
        mountWatcher({ productIds: ['p1'], staleTime: 0, withStockCount: true });
        await flushPromises();

        expect(stockCountOf('p1')).toBe(4);
    });
});
