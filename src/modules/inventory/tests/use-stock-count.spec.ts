/**
 * @module
 * `useStockCount`: only a holder of `read:StockLevel` reads the shelf count, and it lands in the
 * kernel port the product page shows.
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { getInventoryLevel } from '@api';
import { clearAvailability, stockCountOf } from '@/modules/products';
import { useSessionStore } from '@/infrastructure/session.ts';
import { aLevel } from './inventory-fixtures.ts';
import { useStockCount } from '../composables/use-stock-count';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    getInventoryLevel: vi.fn()
}));

/** The ids the probe component is showing. */
const shownIds = () => ['p1'];

/** What the host renders: nothing worth reading. */
const renderNothing = () => h('div');

/** Every host mounted by a case. */
const hosts: VueWrapper[] = [];

/** A component that only hosts the composable. */
const mountHost = () => {
    const wrapper = mount(
        defineComponent({
            setup() {
                useStockCount(shownIds);
                return renderNothing;
            }
        })
    );
    hosts.push(wrapper);
    return wrapper;
};

beforeEach(() => {
    setActivePinia(createPinia());
    clearAvailability();
    vi.mocked(getInventoryLevel).mockReset();
});

afterEach(() => {
    for (const host of hosts.splice(0)) host.unmount();
});

describe('useStockCount', () => {
    it('records the shelf count for a holder of read:StockLevel', async () => {
        vi.spyOn(useSessionStore(), 'can').mockReturnValue(true);
        vi.mocked(getInventoryLevel).mockResolvedValue(aLevel({ productId: 'p1', available: 4 }));

        mountHost();
        await flushPromises();

        expect(getInventoryLevel).toHaveBeenCalledWith('p1');
        expect(stockCountOf('p1')).toBe(4);
    });

    it('makes no request for anyone else, and records nothing', async () => {
        vi.spyOn(useSessionStore(), 'can').mockReturnValue(false);

        mountHost();
        await flushPromises();

        expect(getInventoryLevel).not.toHaveBeenCalled();
        expect(stockCountOf('p1')).toBeUndefined();
    });

    it('records nothing when the read fails, without throwing', async () => {
        vi.spyOn(useSessionStore(), 'can').mockReturnValue(true);
        vi.mocked(getInventoryLevel).mockRejectedValue(new Error('network down'));

        mountHost();
        await flushPromises();

        expect(stockCountOf('p1')).toBeUndefined();
    });
});
