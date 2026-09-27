/**
 * @module
 * Mounts the real cart page against a real, memory-history router, proving the checkout screen
 * answers `docs/modules/cart-checkout.md`'s seven documented refusals differently rather than
 * folding every one into the same generic toast. Same template as `product-view.spec.ts`: a real
 * router over `collectModuleRoutes(enabledModules)`, the store's own fetch stubbed, the cart
 * seeded directly into the store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { useCoreStore } from '@guebbit/vue-toolkit';
import Cart from '@/modules/cart/views/Cart.vue';
import { useCartStore } from '@/modules/cart/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { CartResponse } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this test suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * One line, one summary — the shared non-empty cart every case starts from.
 */
const A_CART: CartResponse = {
    items: [{ productId: 'p1', quantity: 2 }],
    summary: {
        itemsCount: 1,
        totalQuantity: 2,
        itemsTotal: 20,
        shippingCost: 0,
        totalPrice: 20,
        currency: 'EUR'
    }
};

/**
 * A reject-envelope-shaped rejection, matching what `classifyCheckoutError` reads.
 *
 * @param status - HTTP status the API answered with.
 * @param code - The stable error code in `errors[0].code`.
 * @param details - Optional `errors[0].details`.
 */
const checkoutRejection = (status: number, code: string, details?: Record<string, unknown>) => ({
    status,
    errors: [{ code, message: code, details }]
});

/**
 * Mounts the page with the store already holding `A_CART`, and its own fetches stubbed so the
 * refusal under test is the only network outcome each case controls.
 *
 * `checkout` is spied BEFORE mounting, deliberately: `Cart.vue` destructures it from the store at
 * setup time (`const { ..., checkout: placeOrder } = useCartStore()`), so a spy installed after
 * mount replaces the store's OWN property without touching the reference the component already
 * captured — every case has to configure the mock this returns, never re-spy the store.
 *
 * The stub emits a method needing no address as soon as it mounts, the same as a shopper picking
 * `pickup` — these cases are about the refusal handling below the checkout button, not about the
 * button's own disabled state, which stays enabled throughout. Resolves only once that emit has
 * flushed through to the button's `disabled` binding, so every case can click it right away.
 *
 * @returns The mounted wrapper and the `checkout` spy each case configures.
 */
const mountCart = () => {
    const cart = useCartStore();
    cart.cart = A_CART;
    vi.spyOn(cart, 'fetchCart').mockResolvedValue(A_CART);
    vi.spyOn(cart, 'resolveTitles').mockResolvedValue({});
    // Stubbed, not exercised here: this suite is about checkout's own refusals, and the stubbed
    // `ShippingSelector` below emits a method on mount purely to unblock the checkout button —
    // the real `PUT /cart/shipping-method` round trip has its own coverage in `store.spec.ts`.
    vi.spyOn(cart, 'setShippingMethod').mockResolvedValue(A_CART);
    const checkoutSpy = vi.spyOn(cart, 'checkout');

    const wrapper = mount(Cart, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' },
                ShippingSelector: {
                    template: '<div />',
                    mounted() {
                        this.$emit('update:modelValue', 'pickup');
                        this.$emit('update:requiresAddress', false);
                    }
                },
                PaymentMethodSelector: { template: '<div />' }
            }
        }
    });
    return flushPromises().then(() => ({ wrapper, checkoutSpy, cart }));
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() => router.push('/en/cart').then(() => router.isReady()));
});

describe('the checkout refusals', () => {
    it('refetches the cart and names it as changed on CART_CHANGED', () =>
        mountCart().then(({ wrapper, checkoutSpy, cart }) => {
            checkoutSpy.mockRejectedValueOnce(checkoutRejection(409, 'CART_CHANGED'));

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    // Once from `onMounted`, once more from the refusal handler — the second
                    // is what this case exists to prove.
                    expect(cart.fetchCart).toHaveBeenCalledTimes(2);
                });
        }));

    it('names each short line, with its requested and available counts, on CART_INSUFFICIENT_STOCK', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(409, 'CART_INSUFFICIENT_STOCK', {
                    lines: [
                        { productId: 'p1', title: 'Widget', requested: 5, available: 2 },
                        { productId: 'p2', title: 'Gadget', requested: 3, available: 0 }
                    ]
                })
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    // Rendered through the real message, so a swapped `requested`/`available` —
                    // the mistake a bare "contains 5" cannot see — fails here.
                    const lines = wrapper.findAll('[data-test=checkout-shortfall-line]');
                    expect(lines.map((line) => line.text())).toEqual([
                        i18n.global.t('cart-page.shortfall-line', {
                            title: 'Widget',
                            requested: 5,
                            available: 2
                        }),
                        i18n.global.t('cart-page.shortfall-line', {
                            title: 'Gadget',
                            requested: 3,
                            available: 0
                        })
                    ]);
                });
        }));

    it('does not carry a stale shortfall banner into the next, unrelated refusal', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(409, 'CART_INSUFFICIENT_STOCK', {
                    lines: [{ productId: 'p1', title: 'Widget', requested: 5, available: 2 }]
                })
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(1);
                    checkoutSpy.mockRejectedValueOnce(checkoutRejection(409, 'CART_CHANGED'));
                    return wrapper.get('[data-test=cart-checkout]').trigger('click');
                })
                .then(flushPromises)
                .then(() => {
                    expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(0);
                });
        }));

    it('names every line CART_PRODUCT_UNAVAILABLE lists, falling back to the id with no title', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(404, 'CART_PRODUCT_UNAVAILABLE', {
                    lines: [{ productId: 'p1', title: 'Widget' }, { productId: 'p2' }]
                })
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    const lines = wrapper.findAll('[data-test=checkout-unavailable-line]');
                    expect(lines).toHaveLength(2);
                    expect(lines[0]?.text()).toBe('Widget');
                    expect(lines[1]?.text()).toBe('p2');
                });
        }));

    it('answers CART_ADDRESS_NOT_FOUND with a message distinct from the generic fallback', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(checkoutRejection(404, 'CART_ADDRESS_NOT_FOUND'));

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    // Nothing on-screen names a specific line — the distinguishing behaviour
                    // for this refusal is the message (asserted at the domain layer's own
                    // test), not a banner; this proves it is not silently rendered as an
                    // insufficient-stock case.
                    expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(0);
                });
        }));

    /**
     * E12: the resolved address's country fell outside the deployment's ship-to list. Same shape
     * as `CART_ADDRESS_NOT_FOUND` above — a message, no banner — since the fix is picking a
     * different address, not a field this page can correct on the shopper's behalf.
     */
    it('answers CART_SHIP_TO_COUNTRY_NOT_SUPPORTED with a message distinct from the generic fallback', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(422, 'CART_SHIP_TO_COUNTRY_NOT_SUPPORTED')
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(0);
                    expect(wrapper.findAll('[data-test=checkout-unavailable-line]')).toHaveLength(
                        0
                    );
                });
        }));

    /**
     * `mountCart`'s stub renders no radios, so the picked method is driven through the same
     * `v-model` event Cart.vue binds — this case's own stub answers it, rather than reaching for
     * a real `ShippingSelector` that would need a delivery-store methods list this suite never
     * seeds.
     */
    it('clears the chosen shipping method on CART_SHIPPING_METHOD_WEIGHT, unlike every other refusal', () => {
        const cart = useCartStore();
        cart.cart = A_CART;
        vi.spyOn(cart, 'fetchCart').mockResolvedValue(A_CART);
        vi.spyOn(cart, 'resolveTitles').mockResolvedValue({});
        // Stubbed, not exercised: the `v-model` events below drive `shippingMethodId` directly,
        // which the page's own `watch` persists through this action — its real round trip is
        // `store.spec.ts`'s concern.
        vi.spyOn(cart, 'setShippingMethod').mockResolvedValue(A_CART);
        const checkoutSpy = vi.spyOn(cart, 'checkout');
        checkoutSpy.mockRejectedValueOnce(checkoutRejection(409, 'CART_SHIPPING_METHOD_WEIGHT'));

        const wrapper = mount(Cart, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: {
                    LayoutDefault: { template: '<div><slot /></div>' },
                    ShippingSelector: {
                        props: ['modelValue'],
                        emits: ['update:modelValue'],
                        template:
                            '<div data-test="shipping-selector-stub" :data-selected="modelValue" />'
                    },
                    PaymentMethodSelector: { template: '<div />' }
                }
            }
        });

        // `getComponent` with a CSS selector types as `WrapperLike`, which omits `.vm` — the
        // selector's own uniqueness (one match) is what the object-selector overload would
        // otherwise prove for us, same reasoning `order-edit-view.spec.ts` documents.
        const selector = wrapper.getComponent('[data-test=shipping-selector-stub]') as VueWrapper;
        selector.vm.$emit('update:modelValue', 'express');

        return wrapper.vm
            .$nextTick()
            .then(() => {
                expect(
                    wrapper.get('[data-test=shipping-selector-stub]').attributes('data-selected')
                ).toBe('express');
                return wrapper.get('[data-test=cart-checkout]').trigger('click');
            })
            .then(flushPromises)
            .then(() => {
                expect(
                    wrapper.get('[data-test=shipping-selector-stub]').attributes('data-selected')
                ).toBeUndefined();
            });
    });
});

describe('the checkout payload', () => {
    /**
     * `AddressPicker` unmounts the instant a method needing no address is chosen, but its
     * `v-model` ref keeps whatever id it last held — this proves `runCheckout` still leaves
     * `addressId` out of the request rather than sending a stale one paired with a method that
     * cannot use it (the actual 409 `CART_ADDRESS_NOT_APPLICABLE` fix).
     */
    it('drops a stale addressId once the chosen method no longer needs one', () => {
        const cart = useCartStore();
        cart.cart = A_CART;
        vi.spyOn(cart, 'fetchCart').mockResolvedValue(A_CART);
        vi.spyOn(cart, 'resolveTitles').mockResolvedValue({});
        // Stubbed, not exercised: same reasoning as the CART_SHIPPING_METHOD_WEIGHT case above.
        vi.spyOn(cart, 'setShippingMethod').mockResolvedValue(A_CART);
        const checkoutSpy = vi.spyOn(cart, 'checkout').mockResolvedValue(undefined);

        const wrapper = mount(Cart, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: {
                    LayoutDefault: { template: '<div><slot /></div>' },
                    ShippingSelector: {
                        props: ['modelValue', 'requiresAddress'],
                        emits: ['update:modelValue', 'update:requiresAddress'],
                        template: '<div data-test="shipping-selector-stub" />',
                        mounted() {
                            this.$emit('update:modelValue', 'courier');
                            this.$emit('update:requiresAddress', true);
                        }
                    },
                    AddressPicker: {
                        props: ['modelValue'],
                        emits: ['update:modelValue'],
                        template: '<div />',
                        mounted() {
                            this.$emit('update:modelValue', 'addr-1');
                        }
                    },
                    PaymentMethodSelector: { template: '<div />' }
                }
            }
        });

        return flushPromises()
            .then(() => {
                // Courier chosen, address picked — the ordinary case, checkout would send both.
                const selector = wrapper.getComponent(
                    '[data-test=shipping-selector-stub]'
                ) as VueWrapper;
                // The shopper switches to a method needing no address. `AddressPicker` unmounts;
                // `addressId` itself is untouched, still 'addr-1'.
                selector.vm.$emit('update:modelValue', 'pickup');
                selector.vm.$emit('update:requiresAddress', false);
                return wrapper.vm.$nextTick();
            })
            .then(() => wrapper.get('[data-test=cart-checkout]').trigger('click'))
            .then(flushPromises)
            .then(() => {
                expect(checkoutSpy).toHaveBeenCalledOnce();
                expect(checkoutSpy.mock.calls[0]?.[0]).not.toHaveProperty('addressId');
            });
    });
});

describe("the checkout/clear buttons' in-flight guard (FA39)", () => {
    it('disables both while a cart write is in flight', () =>
        mountCart().then(({ wrapper }) => {
            expect(wrapper.get('[data-test=cart-checkout]').attributes('disabled')).toBeUndefined();
            expect(wrapper.get('[data-test=cart-clear]').attributes('disabled')).toBeUndefined();

            // Both buttons share the cart store's own `loading` — the same flag `checkout` and
            // `clearCart` run under — so either write in flight has to block the other one too.
            useCoreStore().setLoading('cart', true);
            return wrapper.vm.$nextTick().then(() => {
                expect(
                    wrapper.get('[data-test=cart-checkout]').attributes('disabled')
                ).toBeDefined();
                expect(wrapper.get('[data-test=cart-clear]').attributes('disabled')).toBeDefined();
            });
        }));
});
