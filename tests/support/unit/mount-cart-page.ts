/**
 * Mounts the real cart page over the REAL cart store, with only the network held by the test.
 *
 * The page's own specs (`cart-view.spec.ts`) stub the store's methods, which is right for what a
 * refusal renders and wrong for what the store and the page do to each other when answers cross.
 * Here the store is real and `@api` is the seam: a spec that mounts through this helper must
 * `vi.mock('@api', ...)` with a `vi.fn()` for every cart operation it drives.
 *
 * The three child pickers are stubbed to the one thing the page reads from each: the shipping
 * picker holds the page's `v-model` (readable as `data-selected`) and the address pickers choose
 * the way a shopper leaving them alone would.
 */
import { vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Cart from '@/modules/cart/views/Cart.vue';
import { useCartStore } from '@/modules/cart/store.ts';
import { useProductsStore } from '@/modules/products';
import { i18n } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { staticPageRouteName } from '@/app/utils/static-pages.ts';
import { emitOn, nextRenderTick } from './mounted-vm';
import type { CartResponse } from '@types';

/**
 * The real app router, scoped to the modules the suite enables, so the post-checkout navigation
 * resolves exactly as it does in the app.
 */
export const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {
            path: '/:locale',
            component: RouterView,
            children: [
                ...collectModuleRoutes(enabledModules),
                // The shell's two legal pages, which the order button links to.
                ...(['terms', 'privacy'] as const).map((page) => ({
                    path: page,
                    name: staticPageRouteName(page),
                    component: { template: '<div />' }
                }))
            ]
        }
    ]
});

/**
 * Stands in for both address pickers: the shipping one takes `addr-1`; the billing one is "same as
 * shipping" while that is on offer and the book's `billing-1` otherwise.
 */
export const AddressPickerStub = defineComponent({
    props: {
        modelValue: { type: String, default: undefined },
        purpose: { type: String, default: 'shipping' },
        sameAsShipping: { type: Boolean, default: false }
    },
    emits: ['update:modelValue'],
    template:
        "<div :data-test=\"purpose === 'billing' ? 'billing-address-picker' : 'address-picker'\" />",
    watch: {
        sameAsShipping: {
            immediate: true,
            handler(
                this: { purpose: string; $emit: (event: 'update:modelValue', id?: string) => void },
                same: boolean
            ) {
                if (this.purpose === 'billing')
                    this.$emit('update:modelValue', same ? undefined : 'billing-1');
                else this.$emit('update:modelValue', 'addr-1');
            }
        }
    }
});

/**
 * Stands in for the shipping picker: shows what the page bound to it, and lets a test pick.
 */
const ShippingSelectorStub = defineComponent({
    props: { modelValue: { type: String, default: undefined } },
    emits: ['update:modelValue', 'update:requiresAddress'],
    template: '<div data-test="shipping-selector-stub" :data-selected="modelValue" />'
});

/**
 * What a mounted cart page hands a spec.
 */
export interface MountedCartPage {
    /** The page. */
    wrapper: VueWrapper;
    /** The real cart store behind it. */
    cart: ReturnType<typeof useCartStore>;
    /** What the shipping picker currently shows as chosen, as the page bound it. */
    selectedShipping: () => string | undefined;
    /** Picks a shipping method the way the shopper does, through the picker's `v-model`. */
    pickShipping: (id: string, requiresAddress: boolean) => Promise<unknown>;
}

/**
 * Mounts the cart page with the store already holding a cart, and its product read stubbed.
 *
 * The page's own `fetchCart` on mount runs for real, against whatever `getCart` the spec armed.
 *
 * @param held - The cart the store already holds when the page opens, if any
 * @returns The page, the store, and two helpers for the shipping picker
 */
export const mountCartPage = (held?: CartResponse): Promise<MountedCartPage> => {
    const cart = useCartStore();
    if (held) cart.cart = held;
    vi.spyOn(useProductsStore(), 'fetchProductsByIds').mockResolvedValue([]);
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
    const selector = () =>
        // The wrapper types a CSS-selector lookup without `.vm`; the selector is unique, which is
        // what the object-selector overload would otherwise prove (`order-edit-view.spec.ts`).
        wrapper.getComponent('[data-test=shipping-selector-stub]') as VueWrapper;
    return flushPromises().then(() => ({
        wrapper,
        cart,
        selectedShipping: () =>
            wrapper.find('[data-test=shipping-selector-stub]').attributes('data-selected'),
        pickShipping: (id, requiresAddress) => {
            emitOn(selector(), 'update:modelValue', id);
            emitOn(selector(), 'update:requiresAddress', requiresAddress);
            return nextRenderTick(wrapper).then(flushPromises);
        }
    }));
};
