/**
 * @module
 * `ShipItemsDialog.vue` — staff cutting a shipment. Mounts the real dialog with `v-dialog` stubbed
 * to render inline and the store's `ship` spied. Covered: quantities default to everything
 * remaining and gate the submit, the tracked-method rule, the forced door and its reason, and a
 * refusal staying in the dialog. The arithmetic is `ship-lines.spec.ts`'s.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShipItemsDialog from '../components/ShipItemsDialog.vue';
import { useDeliveryStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aFulfillmentOrder, aShipment } from '../../../../tests/support/unit/fixtures.ts';
import type { FulfillmentOrder } from '@types';

wireModulesIntoCore();

/**
 * An open group with one line, 2 units remaining, and the ordinary ship door on.
 */
const SHIPPABLE = aFulfillmentOrder({
    actions: { ship: true, fulfill: false, hold: true, release: false }
});

/**
 * Mounts the dialog closed, then opens it through `v-model` — the transition the form re-seeds on.
 *
 * @param fulfillmentOrder - The group being shipped from.
 * @param extra - `trackingRequired` / `canForce`.
 * @returns The wrapper and the spied `ship`.
 */
const openDialog = (
    fulfillmentOrder: FulfillmentOrder,
    extra: { trackingRequired?: boolean; canForce?: boolean } = {}
) => {
    const ship = vi.spyOn(useDeliveryStore(), 'ship').mockResolvedValue(aShipment());
    const wrapper = mount(ShipItemsDialog, {
        props: { modelValue: false, fulfillmentOrder, ...extra },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return wrapper.setProps({ modelValue: true }).then(() => ({ wrapper, ship }));
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('the quantities', () => {
    it('start at everything remaining, labelled with the product title', () =>
        openDialog(SHIPPABLE).then(({ wrapper }) => {
            const field = wrapper.get('[data-test=ship-quantity-p1] input');
            expect((field.element as HTMLInputElement).value).toBe('2');
            expect(wrapper.get('[data-test=ship-quantity-p1]').text()).toContain(
                'Quantity of Shirt'
            );
        }));

    it('ship what is typed, as explicit lines', () =>
        openDialog(SHIPPABLE).then(({ wrapper, ship }) =>
            wrapper
                .get('[data-test=ship-quantity-p1] input')
                .setValue('1')
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(ship).toHaveBeenCalledWith('fo1', {
                        lines: [{ productId: 'p1', quantity: 1 }]
                    });
                    expect(wrapper.emitted('shipped')).toHaveLength(1);
                    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
                })
        ));

    it('refuse more than remains, with a message, and block the submit', () =>
        openDialog(SHIPPABLE).then(({ wrapper }) =>
            wrapper
                .get('[data-test=ship-quantity-p1] input')
                .setValue('5')
                .then(() => {
                    expect(wrapper.find('[data-test=ship-lines-invalid]').exists()).toBe(true);
                    expect(
                        wrapper.get('[data-test=ship-submit]').attributes('disabled')
                    ).toBeDefined();
                })
        ));
});

describe('the tracking code', () => {
    it('is optional on an untracked method, and sent trimmed when given', () =>
        openDialog(SHIPPABLE).then(({ wrapper, ship }) => {
            expect(wrapper.get('[data-test=ship-submit]').attributes('disabled')).toBeUndefined();
            return wrapper
                .get('[data-test=ship-tracking-code] input')
                .setValue('  TRK-1 ')
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => {
                    expect(ship).toHaveBeenCalledWith(
                        'fo1',
                        expect.objectContaining({ trackingCode: 'TRK-1' })
                    );
                });
        }));

    it('is required on a tracked method', () =>
        openDialog(SHIPPABLE, { trackingRequired: true }).then(({ wrapper }) => {
            expect(wrapper.get('[data-test=ship-submit]').attributes('disabled')).toBeDefined();
            return wrapper
                .get('[data-test=ship-tracking-code] input')
                .setValue('TRK-1')
                .then(() => {
                    expect(
                        wrapper.get('[data-test=ship-submit]').attributes('disabled')
                    ).toBeUndefined();
                });
        }));
});

describe('the forced door', () => {
    /**
     * An open group whose ordinary door is closed (the order is still `paid`).
     */
    const CLOSED = aFulfillmentOrder();

    it('is not offered while the ordinary door is open, or without the override', () =>
        Promise.all([
            openDialog(SHIPPABLE, { canForce: true }),
            openDialog(CLOSED, { canForce: false })
        ]).then(([ordinary, noOverride]) => {
            expect(ordinary.wrapper.find('[data-test=ship-force-toggle]').exists()).toBe(false);
            expect(noOverride.wrapper.find('[data-test=ship-force-toggle]').exists()).toBe(false);
        }));

    it('needs the toggle and a reason, then sends forced with it', () =>
        openDialog(CLOSED, { canForce: true }).then(({ wrapper, ship }) => {
            expect(wrapper.get('[data-test=ship-submit]').attributes('disabled')).toBeDefined();
            return wrapper
                .get('[data-test=ship-force-toggle] input')
                .setValue(true)
                .then(() =>
                    wrapper.get('[data-test=ship-force-reason] textarea').setValue('system down')
                )
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => {
                    expect(ship).toHaveBeenCalledWith(
                        'fo1',
                        expect.objectContaining({ forced: true, reason: 'system down' })
                    );
                });
        }));
});

describe('a refusal', () => {
    it('stays in the dialog, which stays open', () =>
        openDialog(SHIPPABLE).then(({ wrapper, ship }) => {
            ship.mockRejectedValue(new Error('DELIVERY_LINES_INVALID'));
            return wrapper
                .get('form')
                .trigger('submit')
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(wrapper.get('[data-test=ship-items-error]').text()).toContain(
                        'DELIVERY_LINES_INVALID'
                    );
                    expect(wrapper.emitted('shipped')).toBeUndefined();
                    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
                });
        }));
});
