/**
 * @module
 * Mounts the real cart page against a real, memory-history router, proving the checkout screen
 * answers `docs/modules/cart-checkout.md`'s seven documented refusals differently rather than
 * folding every one into the same generic toast. Same template as `product-view.spec.ts`: a real
 * router over `collectModuleRoutes(enabledModules)`, the store's own fetch stubbed, the cart
 * seeded directly into the store.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import axe from 'axe-core';
import Cart from '../views/Cart.vue';
import { useCartStore } from '../store.ts';
import type { MergeReportLine } from '../domain';
import { useProductsStore } from '@/modules/products';
import { useDialogStore } from '@/ui/dialog.ts';
import { checkout as apiCheckout, getAccount } from '@api';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { sendKeepalive } from '@/infrastructure/http/keepalive.ts';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { readCheckoutDraft, writeCheckoutDraft } from '../composables/use-checkout-draft.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { AddressPickerStub, router } from '../../../../tests/support/unit/mount-cart-page.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn, nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import type { CartResponse, Order } from '@types';

wireModulesIntoCore();

// The keepalive door is stubbed: what matters here is WHAT the page hands it on `pagehide`.
vi.mock('@/infrastructure/http/keepalive.ts', () => ({ sendKeepalive: vi.fn() }));

/**
 * `checkout` alone is wrapped, real implementation and all (`vi.fn(actual.checkout)` calls
 * through unless a test overrides it): every other case in this file spies on the STORE's own
 * `checkout` method instead, which never reaches this. Only the in-flight-guard test below needs
 * a controllable, genuinely pending API call — `cart.loading` is real, TanStack-tracked state
 * now, so nothing short of an actual in-flight request can make it true.
 */
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@api')>();
    return {
        ...actual,
        checkout: vi.fn(actual.checkout),
        // The purchase-hold banner reads the buyer's own record; offline here unless a case says otherwise.
        getAccount: vi.fn(() => Promise.reject(new Error('offline')))
    };
});

/**
 * One line, one summary — the shared non-empty cart every case starts from.
 */
const A_CART: CartResponse = {
    items: [{ productId: 'p1', quantity: 2, availability: 'in_stock' }],
    summary: {
        itemsCount: 1,
        totalQuantity: 2,
        itemsTotal: 20,
        shippingCost: 0,
        totalPrice: 20,
        currency: 'EUR'
    },
    shipping: {
        required: true,
        selected: null,
        options: [
            { id: 'standard', price: 5, requiresAddress: true, tracked: false },
            { id: 'pickup', price: 0, requiresAddress: false, tracked: false }
        ]
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
const mountCart = ({
    report = [],
    held = A_CART,
    attach = false,
    products = []
}: {
    /** What the last guest-cart merge changed, as the store holds it. */
    report?: MergeReportLine[];
    /** The cart the store already holds. */
    held?: CartResponse;
    /** Whether to attach to the document, for the checks that need real layout (axe). */
    attach?: boolean;
    /** The products the lines join to, put in the products store before the page mounts. */
    products?: Parameters<ReturnType<typeof useProductsStore>['addProduct']>[0][];
} = {}) => {
    const cart = useCartStore();
    cart.cart = held;
    cart.mergeReport = report;
    vi.spyOn(cart, 'fetchCart').mockResolvedValue(held);
    vi.spyOn(useProductsStore(), 'fetchProductsByIds').mockResolvedValue([]);
    for (const product of products) useProductsStore().addProduct(product);
    // Stubbed, not exercised here: this suite is about checkout's own refusals, and the stubbed
    // `ShippingSelector` below emits a method on mount purely to unblock the checkout button —
    // the real `PUT /cart/shipping-method` round trip has its own coverage in `store.spec.ts`.
    vi.spyOn(cart, 'setShippingMethod').mockResolvedValue(A_CART);
    const checkoutSpy = vi.spyOn(cart, 'checkout');
    // Spied before mounting for the same reason as `checkout`: the component captures it at setup.
    const clearSpy = vi.spyOn(cart, 'clearCart').mockResolvedValue(A_CART);

    // `defineComponent` at a top level, not inline in `stubs` below: TypeScript-ESLint cannot
    // fully resolve `this.$emit`'s type when the call is nested straight inside the object
    // literal `mount()`'s own contextual typing flows through.
    const ShippingSelectorStub = defineComponent({
        emits: ['update:modelValue', 'update:requiresAddress'],
        template: '<div />',
        mounted() {
            this.$emit('update:modelValue', 'pickup');
            this.$emit('update:requiresAddress', false);
        }
    });

    const wrapper = mount(Cart, {
        attachTo: attach ? document.body : undefined,
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                ShippingSelector: ShippingSelectorStub,
                AddressPicker: AddressPickerStub,
                PaymentMethodSelector: { template: '<div />' }
            }
        }
    });
    return flushPromises().then(() => ({ wrapper, checkoutSpy, clearSpy, cart }));
};

// The order links point at lazily loaded routes. Load the order page's route component up front
// (through the router, so no module reaches into `orders`), so a checkout's navigation never
// starts a first import (`orders/domain/reorder.ts` and the rest of its chain) that could still
// be pending when this file's environment is torn down.
beforeAll(() =>
    Promise.all(
        router.resolve('/en/orders/o1').matched.map((record) => {
            const component: unknown = record.components?.default;
            return typeof component === 'function' ? (component as () => unknown)() : undefined;
        })
    )
);

// Whatever import is still in flight (a navigation the last test left running) must settle before
// teardown; the flush lets a navigation queued by that test start its import first.
afterAll(() => flushPromises().then(() => vi.dynamicImportSettled()));

beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    setActivePinia(createPinia());
    useSessionStore().viewer = asStub<SessionViewer>({ id: 'u1', email: 'u1@example.com' });
    return loadLocale('en').then(() => router.push('/en/cart').then(() => router.isReady()));
});

describe('the order button', () => {
    it('has the terms and the privacy notice linked right above it', () =>
        mountCart().then(({ wrapper }) => {
            const notice = wrapper.get('[data-test=cart-order-terms]');

            expect(notice.findAll('a')).toHaveLength(2);
            // Above the button, not elsewhere on the page: the buyer reads it at the moment of ordering.
            const html = wrapper.html();
            expect(html.indexOf('data-test="cart-order-terms"')).toBeLessThan(
                html.indexOf('data-test="cart-checkout"')
            );
        }));
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

    it('names the old and the new total on CART_TOTAL_CHANGED, and keeps the button live', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(409, 'CART_TOTAL_CHANGED', {
                    expected: { amount: 2000, currency: 'EUR' },
                    actual: { amount: 2450, currency: 'EUR' }
                })
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    const toast = useNotificationsStore().messages.find(({ message }) =>
                        message.includes('The total changed')
                    );
                    expect(toast?.message).toBe(
                        `The total changed from ${formatCurrency(20, 'EUR')} to ${formatCurrency(24.5, 'EUR')}. Check it and place the order again.`
                    );
                    // Not CART_CHANGED's sentence, and no generic error under the button.
                    expect(wrapper.find('[data-test=cart-checkout-error]').exists()).toBe(false);
                    expect(
                        wrapper.get('[data-test=cart-checkout]').attributes('disabled')
                    ).toBeUndefined();
                });
        }));

    it('says the total changed without figures when the refusal carries none', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(checkoutRejection(409, 'CART_TOTAL_CHANGED'));

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    const toasts = useNotificationsStore().messages.map(({ message }) => message);
                    expect(toasts).toContain(
                        'The total changed since this page showed it. Check it and place the order again.'
                    );
                });
        }));

    it('names each short line, with the quantity asked for, on CART_INSUFFICIENT_STOCK', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(409, 'CART_INSUFFICIENT_STOCK', {
                    lines: [
                        {
                            productId: 'p1',
                            title: 'Widget',
                            requested: 5,
                            availability: 'insufficient_stock'
                        },
                        {
                            productId: 'p2',
                            title: 'Gadget',
                            requested: 3,
                            availability: 'insufficient_stock'
                        },
                        {
                            productId: 'p3',
                            title: 'Lamp',
                            requested: 1,
                            availability: 'out_of_stock'
                        },
                        {
                            productId: 'p4',
                            title: 'Heater',
                            requested: 1,
                            availability: 'unavailable'
                        }
                    ]
                })
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    // Rendered through the real message, so a wrong title or quantity — the
                    // mistake a bare "contains 5" cannot see — fails here.
                    const lines = wrapper.findAll('[data-test=checkout-shortfall-line]');
                    expect(lines.map((line) => line.text())).toEqual([
                        i18n.global.t('cart-page.shortfall-line', {
                            title: 'Widget',
                            requested: 5
                        }),
                        i18n.global.t('cart-page.shortfall-line', {
                            title: 'Gadget',
                            requested: 3
                        }),
                        // Sold out and off sale each get their own sentence, with no quantity.
                        i18n.global.t('cart-page.shortfall-line-out-of-stock', { title: 'Lamp' }),
                        i18n.global.t('cart-page.shortfall-line-unavailable', { title: 'Heater' })
                    ]);
                });
        }));

    it('does not carry a stale shortfall banner into the next, unrelated refusal', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(409, 'CART_INSUFFICIENT_STOCK', {
                    lines: [
                        {
                            productId: 'p1',
                            title: 'Widget',
                            requested: 5,
                            availability: 'insufficient_stock'
                        }
                    ]
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

    it('links every unpaid order CART_OPEN_ORDER_LIMIT names, in plain words', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(409, 'CART_OPEN_ORDER_LIMIT', { orderIds: ['o1', 'o2'] })
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    const alert = wrapper.get('[data-test=cart-open-orders]');
                    expect(alert.text()).toContain(
                        i18n.global.t('cart-page.error-open-order-limit')
                    );
                    const links = wrapper.findAll('[data-test=cart-open-order-link]');
                    expect(links.map((link) => link.attributes('href'))).toEqual([
                        '/en/orders/o1',
                        '/en/orders/o2'
                    ]);
                });
        }));

    it("says checkout is paused on CART_PURCHASE_HOLD and reads the buyer's own record again for the banner", () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            vi.mocked(getAccount).mockClear();
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(409, 'CART_PURCHASE_HOLD', {
                    until: '2999-01-01T00:00:00.000Z',
                    reason: 'repeated_cancellations'
                })
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(
                        useNotificationsStore().messages.map(({ message }) => message)
                    ).toContain(i18n.global.t('cart-page.error-purchase-hold'));
                    // Read again, not served from the cache: the cached record predates the hold.
                    expect(getAccount).toHaveBeenCalledTimes(1);
                    // Not rendered as a stock or order-limit refusal.
                    expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(0);
                    expect(wrapper.find('[data-test=cart-open-orders]').exists()).toBe(false);
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

    it('answers CART_BILLING_ADDRESS_REQUIRED with its own message, not the generic fallback', () =>
        mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockRejectedValueOnce(
                checkoutRejection(422, 'CART_BILLING_ADDRESS_REQUIRED')
            );

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    // A message, not a banner: the fix is choosing or adding an address.
                    expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(0);
                    expect(wrapper.find('[data-test=checkout-error]').exists()).toBe(false);
                });
        }));

    /**
     * The resolved address's country fell outside the deployment's ship-to list. Same shape
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
        vi.spyOn(useProductsStore(), 'fetchProductsByIds').mockResolvedValue([]);
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
                    ShippingSelector: {
                        props: ['modelValue'],
                        emits: ['update:modelValue'],
                        template:
                            '<div data-test="shipping-selector-stub" :data-selected="modelValue" />'
                    },
                    AddressPicker: AddressPickerStub,
                    PaymentMethodSelector: { template: '<div />' }
                }
            }
        });

        // `getComponent` with a CSS selector types as `WrapperLike`, which omits `.vm` — the
        // selector's own uniqueness (one match) is what the object-selector overload would
        // otherwise prove for us, same reasoning `order-edit-view.spec.ts` documents.
        const selector = wrapper.getComponent('[data-test=shipping-selector-stub]') as VueWrapper;
        emitOn(selector, 'update:modelValue', 'express');

        return nextRenderTick(wrapper)
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
        vi.spyOn(useProductsStore(), 'fetchProductsByIds').mockResolvedValue([]);
        // Stubbed, not exercised: same reasoning as the CART_SHIPPING_METHOD_WEIGHT case above.
        vi.spyOn(cart, 'setShippingMethod').mockResolvedValue(A_CART);
        const checkoutSpy = vi.spyOn(cart, 'checkout').mockResolvedValue(undefined);

        // `defineComponent` at a top level, not inline in `stubs` below: TypeScript-ESLint
        // cannot fully resolve `this.$emit`'s type when the call is nested straight inside the
        // object literal `mount()`'s own contextual typing flows through.
        const ShippingSelectorStub = defineComponent({
            props: ['modelValue', 'requiresAddress'],
            emits: ['update:modelValue', 'update:requiresAddress'],
            template: '<div data-test="shipping-selector-stub" />',
            mounted() {
                this.$emit('update:modelValue', 'courier');
                this.$emit('update:requiresAddress', true);
            }
        });

        const wrapper = mount(Cart, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: {
                    ShippingSelector: ShippingSelectorStub,
                    AddressPicker: AddressPickerStub,
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
                emitOn(selector, 'update:modelValue', 'pickup');
                emitOn(selector, 'update:requiresAddress', false);
                return nextRenderTick(wrapper);
            })
            .then(() => wrapper.get('[data-test=cart-checkout]').trigger('click'))
            .then(flushPromises)
            .then(() => {
                expect(checkoutSpy).toHaveBeenCalledOnce();
                expect(checkoutSpy.mock.calls[0]?.[0]).not.toHaveProperty('addressId');
            });
    });
});

describe('the Clear cart button asks before it empties the basket', () => {
    it('asks a destructive question that names how many lines go, and clears nothing yet', () => {
        // Never answered: the dialog host is not mounted here, so the question just stays open.
        const confirmSpy = vi
            .spyOn(useDialogStore(), 'confirm')
            .mockReturnValue(new Promise(() => {}));

        return mountCart().then(({ wrapper, clearSpy }) =>
            wrapper
                .get('[data-test=cart-clear]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(confirmSpy).toHaveBeenCalledExactlyOnceWith({
                        message: i18n.global.t(
                            'cart-page.confirm-clear',
                            { count: A_CART.items.length },
                            A_CART.items.length
                        ),
                        color: 'error'
                    });
                    expect(clearSpy).not.toHaveBeenCalled();
                })
        );
    });

    it('clears the cart once the shopper accepts', () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);

        return mountCart().then(({ wrapper, clearSpy }) =>
            wrapper
                .get('[data-test=cart-clear]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(clearSpy).toHaveBeenCalledOnce();
                })
        );
    });

    it('leaves the cart alone when the shopper declines', () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);

        return mountCart().then(({ wrapper, clearSpy }) =>
            wrapper
                .get('[data-test=cart-clear]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(clearSpy).not.toHaveBeenCalled();
                })
        );
    });

    it('blocks the line actions in place when the accepted clear is refused', () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);

        return mountCart().then(({ wrapper, clearSpy }) => {
            clearSpy.mockRejectedValueOnce(checkoutRejection(500, 'INTERNAL_ERROR'));

            return wrapper
                .get('[data-test=cart-clear]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(wrapper.find('[data-test=cart-line-action-error]').exists()).toBe(true);
                });
        });
    });
});

describe('the checkout payload — billing', () => {
    /**
     * Courier chosen: the shipping picker is asked and billing defaults to "same as shipping",
     * which the API reads from an OMITTED `billingAddressId` — sending one would pin a choice the
     * shopper never made.
     */
    it('leaves billingAddressId out while billing is "same as shipping"', () => {
        const cart = useCartStore();
        cart.cart = A_CART;
        vi.spyOn(cart, 'fetchCart').mockResolvedValue(A_CART);
        vi.spyOn(useProductsStore(), 'fetchProductsByIds').mockResolvedValue([]);
        vi.spyOn(cart, 'setShippingMethod').mockResolvedValue(A_CART);
        const checkoutSpy = vi.spyOn(cart, 'checkout').mockResolvedValue(undefined);
        const CourierStub = defineComponent({
            props: ['modelValue', 'requiresAddress'],
            emits: ['update:modelValue', 'update:requiresAddress'],
            template: '<div />',
            mounted() {
                this.$emit('update:modelValue', 'standard');
                this.$emit('update:requiresAddress', true);
            }
        });
        const wrapper = mount(Cart, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: {
                    ShippingSelector: CourierStub,
                    AddressPicker: AddressPickerStub,
                    PaymentMethodSelector: { template: '<div />' }
                }
            }
        });

        return flushPromises()
            .then(() => {
                expect(wrapper.find('[data-test=address-picker]').exists()).toBe(true);
                expect(wrapper.find('[data-test=billing-address-picker]').exists()).toBe(true);
                return wrapper.get('[data-test=cart-checkout]').trigger('click');
            })
            .then(flushPromises)
            .then(() => {
                expect(checkoutSpy.mock.calls[0]?.[0]).toMatchObject({ addressId: 'addr-1' });
                expect(checkoutSpy.mock.calls[0]?.[0]).not.toHaveProperty('billingAddressId');
            });
    });

    it('sends the billing entry the shopper named when it is not the shipping one', () =>
        mountCart().then(({ wrapper, checkoutSpy }) =>
            // `mountCart` picks `pickup`: nothing ships to an address, so billing stands alone
            // and carries the picked entry.
            wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(checkoutSpy.mock.calls[0]?.[0]).toMatchObject({
                        billingAddressId: 'billing-1'
                    });
                    expect(checkoutSpy.mock.calls[0]?.[0]).not.toHaveProperty('addressId');
                })
        ));

    it('holds checkout back while billing stands alone and no entry is chosen', () => {
        const cart = useCartStore();
        cart.cart = { ...A_CART, shipping: { required: false, selected: null, options: [] } };
        vi.spyOn(cart, 'fetchCart').mockResolvedValue(cart.cart);
        vi.spyOn(useProductsStore(), 'fetchProductsByIds').mockResolvedValue([]);
        vi.spyOn(cart, 'checkout').mockResolvedValue(undefined);
        const wrapper = mount(Cart, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: {
                    // An empty book: the picker has nothing to pre-choose.
                    AddressPicker: { template: '<div data-test="billing-address-picker" />' },
                    PaymentMethodSelector: { template: '<div />' }
                }
            }
        });

        return flushPromises().then(() => {
            expect(wrapper.get('[data-test=cart-checkout]').attributes('disabled')).toBeDefined();
        });
    });
});

describe("the checkout/clear buttons' in-flight guard", () => {
    it('disables both while a cart write is in flight', () =>
        mountCart().then(({ wrapper }) => {
            expect(wrapper.get('[data-test=cart-checkout]').attributes('disabled')).toBeUndefined();
            expect(wrapper.get('[data-test=cart-clear]').attributes('disabled')).toBeUndefined();

            // A genuinely pending API call — `cart.loading` is real, TanStack-tracked state now,
            // so nothing short of an actual in-flight request moves it. Both buttons share the
            // cart store's own `loading`, the same flag `checkout` and `clearCart` run under, so
            // either write in flight has to block the other one too.
            // Rejected, not resolved, once released: a resolved checkout empties the cart
            // and the buttons this test reads unmount along with it — a rejection settles the
            // mutation without disturbing the cart this test asserts against afterwards.
            let release: ((error: Error) => void) | undefined;
            const gate = new Promise<never>((_resolve, reject) => {
                release = reject;
            });
            vi.mocked(apiCheckout).mockReturnValueOnce(gate);

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(
                        wrapper.get('[data-test=cart-checkout]').attributes('disabled')
                    ).toBeDefined();
                    expect(
                        wrapper.get('[data-test=cart-clear]').attributes('disabled')
                    ).toBeDefined();
                    release?.(new Error('network down'));
                    return flushPromises();
                })
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(
                        wrapper.get('[data-test=cart-checkout]').attributes('disabled')
                    ).toBeUndefined();
                    expect(
                        wrapper.get('[data-test=cart-clear]').attributes('disabled')
                    ).toBeUndefined();
                });
        }));
});

describe('a cart with nothing to ship', () => {
    const DIGITAL_CART: CartResponse = {
        ...A_CART,
        shipping: { required: false, selected: null, options: [] }
    };

    /**
     * Mounts the page over a cart whose shipping is not required, with the selector stubbed to a
     * marker so its absence, rather than its contents, is what the cases read.
     */
    const mountDigital = () => {
        const cart = useCartStore();
        cart.cart = DIGITAL_CART;
        vi.spyOn(cart, 'fetchCart').mockResolvedValue(DIGITAL_CART);
        vi.spyOn(useProductsStore(), 'fetchProductsByIds').mockResolvedValue([]);
        // Before mounting: `Cart.vue` captures `checkout` from the store at setup time.
        const checkoutSpy = vi.spyOn(cart, 'checkout').mockResolvedValue(undefined);
        const wrapper = mount(Cart, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: {
                    ShippingSelector: { template: '<div data-test="shipping-selector" />' },
                    AddressPicker: AddressPickerStub,
                    PaymentMethodSelector: { template: '<div />' }
                }
            }
        });
        return flushPromises().then(() => ({ wrapper, checkoutSpy }));
    };

    it('says so in one line instead of showing an empty shipping heading', () =>
        mountDigital().then(({ wrapper }) => {
            expect(wrapper.find('[data-test=shipping-selector]').exists()).toBe(false);
            expect(wrapper.get('[data-test=cart-no-shipping]').text()).toBe(
                i18n.global.t('cart-page.no-shipping-needed')
            );
        }));

    it('asks for a billing address only, pre-chosen from the book, and checks out with it', () =>
        mountDigital().then(({ wrapper, checkoutSpy }) => {
            expect(wrapper.find('[data-test=address-picker]').exists()).toBe(false);
            expect(wrapper.find('[data-test=billing-address-picker]').exists()).toBe(true);

            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(checkoutSpy).toHaveBeenCalledOnce();
                    expect(checkoutSpy.mock.calls[0]?.[0]).toMatchObject({
                        billingAddressId: 'billing-1'
                    });
                    expect(checkoutSpy.mock.calls[0]?.[0]).not.toHaveProperty('addressId');
                });
        }));

    it('still shows the selector for a cart that ships', () =>
        mountCart().then(({ wrapper }) => {
            expect(wrapper.find('[data-test=cart-no-shipping]').exists()).toBe(false);
        }));
});

describe('a reload in the middle of checkout', () => {
    it('puts the note back, and keeps typing saved for the next reload', () => {
        writeCheckoutDraft('u1', { notes: 'Ring twice' });

        return mountCart().then(({ wrapper }) => {
            const field = wrapper.get('[data-test=cart-notes] textarea');
            expect((field.element as HTMLTextAreaElement).value).toBe('Ring twice');

            return field.setValue('Ring three times').then(() => {
                expect(readCheckoutDraft('u1').notes).toBe('Ring three times');
            });
        });
    });

    it('sends the restored note, payment choice and address with the order', () => {
        writeCheckoutDraft('u1', {
            notes: 'Ring twice',
            paymentMethodId: 'bank_transfer',
            addressId: 'addr-2'
        });

        return mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockResolvedValue(undefined);
            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    // `pickup` needs no address, so the address is not sent; the rest are.
                    expect(checkoutSpy.mock.calls[0]?.[0]).toMatchObject({
                        notes: 'Ring twice',
                        paymentMethod: 'bank_transfer'
                    });
                });
        });
    });

    it('forgets the draft once the order is placed', () => {
        writeCheckoutDraft('u1', { notes: 'Ring twice' });

        return mountCart().then(({ wrapper, checkoutSpy }) => {
            checkoutSpy.mockResolvedValue(asStub<Order>({ id: 'order-1' }));
            return wrapper
                .get('[data-test=cart-checkout]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(readCheckoutDraft('u1')).toEqual({ notes: '' });
                });
        });
    });

    it('sends a quantity still in its debounce by a request that outlives the page', () => {
        return mountCart().then(({ wrapper }) => {
            return wrapper
                .get('[data-test=cart-increase]')
                .trigger('click')
                .then(() => {
                    globalThis.dispatchEvent(new Event('pagehide'));

                    expect(sendKeepalive).toHaveBeenCalledWith('PUT', '/cart/p1', { quantity: 3 });
                });
        });
    });
});

/**
 * What a merge that changed two lines leaves in the store.
 */
const A_REPORT: MergeReportLine[] = [
    { productId: 'p1', requested: 2, resulting: 5, reason: 'summed', availability: 'in_stock' },
    {
        productId: 'p2',
        requested: 1,
        resulting: 0,
        reason: 'removed',
        availability: 'in_stock'
    }
];

/**
 * `A_CART` with its one line flagged short by the server.
 */
const A_SHORT_CART: CartResponse = {
    ...A_CART,
    items: [{ productId: 'p1', quantity: 2, availability: 'insufficient_stock' }]
};

describe('the merge alert', () => {
    it('stands above the lines, and a page opened with no report has none', () =>
        mountCart({ report: A_REPORT }).then(({ wrapper }) => {
            const html = wrapper.html();

            expect(wrapper.findAll('[data-test=cart-merge-report-line]')).toHaveLength(2);
            expect(html.indexOf('data-test="cart-merge-report"')).toBeLessThan(
                html.indexOf('data-test="cart-item"')
            );

            return mountCart().then(({ wrapper: quiet }) => {
                expect(quiet.find('[data-test=cart-merge-report]').exists()).toBe(false);
            });
        }));

    it('is shown over an empty cart too: a merge that added nothing is when it matters', () =>
        mountCart({
            report: [
                {
                    productId: 'p2',
                    requested: 1,
                    resulting: 0,
                    reason: 'removed',
                    availability: 'in_stock'
                }
            ],
            held: { ...A_CART, items: [] }
        }).then(({ wrapper }) => {
            expect(wrapper.find('[data-test=cart-merge-report]').exists()).toBe(true);
            expect(wrapper.text()).toContain('Your cart is empty');
        }));

    it('survives leaving the page and coming back, until it is dismissed', () =>
        mountCart({ report: A_REPORT }).then(({ wrapper, cart }) => {
            wrapper.unmount();

            return mountCart({ report: cart.mergeReport }).then(({ wrapper: again }) => {
                expect(again.find('[data-test=cart-merge-report]').exists()).toBe(true);

                return again
                    .get('button[aria-label="Dismiss"]')
                    .trigger('click')
                    .then(flushPromises)
                    .then(() => {
                        expect(again.find('[data-test=cart-merge-report]').exists()).toBe(false);
                        expect(cart.mergeReport).toEqual([]);
                    });
            });
        }));

    it('does not disturb the quantity and total live regions the page already has', () =>
        mountCart({ report: A_REPORT }).then(({ wrapper }) => {
            const statuses = wrapper.findAll('[role=status]');
            const alert = wrapper.get('[data-test=cart-merge-report]');

            // The line's quantity, the total, and the alert's own single region.
            expect(statuses).toHaveLength(3);
            expect(alert.attributes('role')).toBe('status');
            expect(alert.findAll('[role=status]')).toHaveLength(0);
        }));

    it('leaves the signed-in cart, lines and alert together, free of axe violations', () =>
        mountCart({
            report: [
                ...A_REPORT,
                {
                    productId: 'p1',
                    requested: 2,
                    resulting: 2,
                    availability: 'insufficient_stock'
                }
            ],
            held: A_SHORT_CART,
            attach: true
        }).then(({ wrapper }) =>
            axe
                // https://github.com/dequelabs/axe-core/blob/master/doc/API.md#api-name-axerun
                // `color-contrast` needs real layout and styles, which jsdom does not compute.
                .run(document.body, {
                    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } }
                })
                .then((results) => {
                    wrapper.unmount();
                    expect(
                        results.violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.html}`)
                    ).toEqual([]);
                })
        ));
});

describe('the short marker on a line', () => {
    it('shows on a line the server flags short, in words, and on no other', () =>
        mountCart({
            held: {
                ...A_CART,
                items: [
                    { productId: 'p1', quantity: 2, availability: 'insufficient_stock' },
                    { productId: 'p2', quantity: 1, availability: 'in_stock' }
                ]
            }
        }).then(({ wrapper }) => {
            const [first, second] = wrapper.findAll('[data-test=cart-item]');

            expect(first?.get('[data-test=cart-line-availability]').text()).toBe(
                'Not enough in stock'
            );
            expect(second?.find('[data-test=cart-line-availability]').exists()).toBe(false);
        }));

    it('is absent when no line is short', () =>
        mountCart().then(({ wrapper }) => {
            expect(wrapper.find('[data-test=cart-line-availability]').exists()).toBe(false);
        }));

    it('follows the cart in the store: it appears when a later answer flags the line', () =>
        mountCart().then(({ wrapper, cart }) => {
            cart.cart = A_SHORT_CART;

            return flushPromises().then(() => {
                expect(wrapper.find('[data-test=cart-line-availability]').exists()).toBe(true);

                cart.cart = A_CART;
                return flushPromises().then(() => {
                    expect(wrapper.find('[data-test=cart-line-availability]').exists()).toBe(false);
                });
            });
        }));

    it('adds no live region of its own: the quantity line that holds it is the one that speaks', () =>
        mountCart({ held: A_SHORT_CART }).then(({ wrapper }) => {
            const marker = wrapper.get('[data-test=cart-line-availability]');

            // The line's quantity and the total are the page's two statuses, short or not.
            expect(wrapper.findAll('[role=status]')).toHaveLength(2);
            expect(marker.attributes('role')).toBeUndefined();
            expect(marker.element.closest('[role=status]')).not.toBeNull();
        }));

    it('keeps the quantity the shopper sees, and shows no number of what is for sale', () =>
        mountCart({ held: A_SHORT_CART }).then(({ wrapper }) => {
            const line = wrapper.get('[data-test=cart-item]').text();

            expect(line).toContain('Quantity: 2');
            expect(line.match(/\d+/g)).toEqual(['2']);
        }));
});

describe('every availability on a line', () => {
    it.each([
        ['out_of_stock', 'Sold out'],
        ['unavailable', 'Not available right now'],
        ['removed', 'No longer available'],
        ['preorder', 'Preorder']
    ] as const)('words a %s line as "%s"', (availability, words) =>
        mountCart({
            held: { ...A_CART, items: [{ productId: 'p1', quantity: 2, availability }] }
        }).then(({ wrapper }) => {
            const marker = wrapper.get('[data-test=cart-line-availability]');

            expect(marker.text()).toBe(words);
            expect(marker.attributes('data-availability')).toBe(availability);
        })
    );

    it.each(['insufficient_stock', 'out_of_stock', 'unavailable', 'removed'] as const)(
        'holds "Place order" back for a %s line, and says why',
        (availability) =>
            mountCart({
                held: { ...A_CART, items: [{ productId: 'p1', quantity: 2, availability }] }
            }).then(({ wrapper }) => {
                expect(
                    wrapper.get('[data-test=cart-checkout]').attributes('disabled')
                ).toBeDefined();
                expect(wrapper.find('[data-test=cart-lines-need-attention]').exists()).toBe(true);
            })
    );

    it('leaves "Place order" live for a preorder line: it is bought now and ships later', () =>
        mountCart({
            held: {
                ...A_CART,
                items: [{ productId: 'p1', quantity: 2, availability: 'preorder' }]
            }
        }).then(({ wrapper }) => {
            expect(wrapper.get('[data-test=cart-checkout]').attributes('disabled')).toBeUndefined();
            expect(wrapper.find('[data-test=cart-lines-need-attention]').exists()).toBe(false);
        }));

    it('leaves "Place order" live, and says nothing, when every line can be bought', () =>
        mountCart().then(({ wrapper }) => {
            expect(wrapper.get('[data-test=cart-checkout]').attributes('disabled')).toBeUndefined();
            expect(wrapper.find('[data-test=cart-lines-need-attention]').exists()).toBe(false);
        }));
});

describe('the stock poll on the page', () => {
    beforeEach(() => {
        // Only the interval is fake: `flushPromises` and the router need the real timers.
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
        useSessionStore().accessToken = 'test-token';
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.useRealTimers();
    });

    it('re-reads the cart every N seconds while the page is open, when the knob is set', () => {
        vi.stubEnv('VITE_CART_STOCK_POLL_SECONDS', '5');

        return mountCart().then(({ cart }) => {
            const poll = vi.spyOn(cart, 'pollCart').mockResolvedValue(undefined);

            vi.advanceTimersByTime(5000);
            expect(poll).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(10_000);
            expect(poll).toHaveBeenCalledTimes(3);
        });
    });

    it('stops when the page is left', () => {
        vi.stubEnv('VITE_CART_STOCK_POLL_SECONDS', '5');

        return mountCart().then(({ wrapper, cart }) => {
            const poll = vi.spyOn(cart, 'pollCart').mockResolvedValue(undefined);

            wrapper.unmount();
            vi.advanceTimersByTime(60_000);

            expect(poll).not.toHaveBeenCalled();
        });
    });

    it('does nothing at all when the knob is not set', () =>
        mountCart().then(({ cart }) => {
            const poll = vi.spyOn(cart, 'pollCart').mockResolvedValue(undefined);

            vi.advanceTimersByTime(3_600_000);

            expect(vi.getTimerCount()).toBe(0);
            expect(poll).not.toHaveBeenCalled();
        }));
});

/** A product the lines join to, marked or not as having no right of withdrawal. */
const product = (id: string, noWithdrawal: boolean) => ({
    id,
    title: `Product ${id}`,
    price: 10,
    currency: 'EUR',
    inStock: true,
    lowStock: false,
    noWithdrawal
});

describe('the no-withdrawal marker on a line', () => {
    it('tells the shopper, before buying, which line has no right of withdrawal', () =>
        mountCart({
            held: {
                ...A_CART,
                items: [
                    { productId: 'p1', quantity: 1, availability: 'in_stock' },
                    { productId: 'p2', quantity: 1, availability: 'in_stock' }
                ]
            },
            products: [product('p1', true), product('p2', false)]
        }).then(({ wrapper }) => {
            const [first, second] = wrapper.findAll('[data-test=cart-item]');

            expect(first?.get('[data-test=cart-line-no-withdrawal]').text()).toBe(
                'No right of withdrawal'
            );
            expect(second?.find('[data-test=cart-line-no-withdrawal]').exists()).toBe(false);
        }));
});
