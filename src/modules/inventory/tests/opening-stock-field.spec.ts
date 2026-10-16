/**
 * @module
 * The opening-stock field the product create form hosts through its `product-create-extras` slot.
 * Stock is not a product field: the field asks the form for a step to run once the product exists,
 * and that step receives the count through the inventory door, which needs the stock key — so a
 * caller without it is shown nothing and receives nothing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import OpeningStockField from '../components/OpeningStockField.vue';
import { useInventoryStore } from '../store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

/**
 * Mounts the field for a caller holding exactly `abilities`, keeping the step it registers.
 *
 * @param abilities - What the viewer may do, as `[action, subject]` pairs.
 * @returns The wrapper, the step the field registered, and the spied `receive`.
 */
const mountFieldAs = (abilities: [string, string][]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'staff@example.com', role: 'editor' };
    session.setAbilities({ tenant: abilities, platform: [] });
    const receive = vi.spyOn(useInventoryStore(), 'receive').mockResolvedValue(undefined);
    const steps: ((productId: string) => Promise<void>)[] = [];
    const wrapper = mount(OpeningStockField, {
        props: {
            registerAfterCreate: (step: (productId: string) => Promise<void>) => {
                steps.push(step);
            }
        },
        global: { plugins: [vuetify, i18n] }
    });
    return { wrapper, steps, receive };
};

/**
 * Types a count into the field.
 *
 * @param wrapper - The mounted field.
 * @param quantity - What to type.
 */
const typeCount = (wrapper: ReturnType<typeof mountFieldAs>['wrapper'], quantity: number) =>
    wrapper
        .get('[data-test=product-on-hand-field] input')
        .setValue(String(quantity))
        .then(() => flushPromises());

describe('OpeningStockField', () => {
    it('is offered to a caller who may book stock, and to nobody else', () => {
        expect(
            mountFieldAs([['create', 'StockMovement']])
                .wrapper.find('[data-test=product-on-hand-field]')
                .exists()
        ).toBe(true);
        expect(
            mountFieldAs([['create', 'Product']])
                .wrapper.find('[data-test=product-on-hand-field]')
                .exists()
        ).toBe(false);
    });

    it('receives the typed count against the new product, as an opening delivery', () => {
        const { wrapper, steps, receive } = mountFieldAs([['create', 'StockMovement']]);

        return typeCount(wrapper, 5)
            .then(() => steps[0]('p2'))
            .then(() => {
                expect(steps).toHaveLength(1);
                expect(receive).toHaveBeenCalledWith('p2', 5, 'Opening stock');
            });
    });

    it('receives nothing when no count was typed, or when the caller holds no stock key', () => {
        const none = mountFieldAs([['create', 'StockMovement']]);
        const keyless = mountFieldAs([['create', 'Product']]);

        return Promise.all([none.steps[0]('p2'), keyless.steps[0]('p2')]).then(() => {
            expect(none.receive).not.toHaveBeenCalled();
            expect(keyless.receive).not.toHaveBeenCalled();
        });
    });

    it('settles when the receipt fails, so the create it follows is never undone', () => {
        const { wrapper, steps, receive } = mountFieldAs([['create', 'StockMovement']]);
        receive.mockRejectedValueOnce(new Error('Network Error'));

        return typeCount(wrapper, 5).then(() => expect(steps[0]('p2')).resolves.toBeUndefined());
    });
});
