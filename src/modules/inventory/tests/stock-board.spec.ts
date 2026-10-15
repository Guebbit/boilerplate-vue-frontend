/**
 * @module
 * `StockBoard.vue` — the preorder columns and the limit control. The control is a stock write
 * (`create:StockMovement`), so a reader without it sees the numbers and no button; the button opens
 * the dialog on its own row.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import StockBoard from '../components/StockBoard.vue';
import PreorderLimitDialog from '../components/PreorderLimitDialog.vue';
import { useInventoryStore } from '../store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aLevel } from '../../../../tests/support/unit/fixtures.ts';
import type { InventoryLevel } from '@types';

wireModulesIntoCore();

/**
 * Mounts the board over the rows the spied read hands it.
 *
 * @param rows - The board page.
 * @param abilities - What the viewer may do, as `[action, subject]` pairs.
 * @returns The wrapper.
 */
const mountBoard = (rows: InventoryLevel[], abilities: [string, string][]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'staff@example.com', role: 'admin' };
    session.setAbilities({ tenant: abilities, platform: [] });
    const inventory = useInventoryStore();
    vi.spyOn(inventory, 'fetchLevels').mockImplementation(() => {
        inventory.levels = rows;
        inventory.levelsTotal = rows.length;
        return Promise.resolve(rows);
    });
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', component: { template: '<div />' } }]
    });
    return mount(StockBoard, { global: { plugins: [vuetify, i18n, router] } });
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('StockBoard preorder columns', () => {
    it('shows each product’s limit and what is outstanding against it', () => {
        const wrapper = mountBoard(
            [aLevel({ preorderLimit: 10, preordered: 4 })],
            [['read', 'StockLevel']]
        );

        return flushPromises().then(() => {
            const text = wrapper.get('[data-test=level-row]').text();

            expect(text).toContain('10');
            expect(text).toContain('4');
            expect(wrapper.text()).toContain('Preorder limit');
        });
    });

    it('offers the limit control to a holder of the stock write only', () => {
        const reader = mountBoard([aLevel()], [['read', 'StockLevel']]);

        return flushPromises()
            .then(() => {
                expect(reader.find('[data-test=level-preorder-limit]').exists()).toBe(false);
                setActivePinia(createPinia());
                const writer = mountBoard(
                    [aLevel()],
                    [
                        ['read', 'StockLevel'],
                        ['create', 'StockMovement']
                    ]
                );
                return flushPromises().then(() => writer);
            })
            .then((writer) => {
                expect(writer.find('[data-test=level-preorder-limit]').exists()).toBe(true);
            });
    });

    it('opens the dialog on the row whose button was pressed', () => {
        const wrapper = mountBoard(
            [
                aLevel({ productId: 'p1', title: 'Desk' }),
                aLevel({ productId: 'p2', title: 'Lamp' })
            ],
            [
                ['read', 'StockLevel'],
                ['create', 'StockMovement']
            ]
        );

        return flushPromises()
            .then(() => wrapper.findAll('[data-test=level-preorder-limit]')[1]?.trigger('click'))
            .then(flushPromises)
            .then(() => {
                expect(wrapper.findComponent(PreorderLimitDialog).props('level')).toMatchObject({
                    productId: 'p2'
                });
            });
    });
});
