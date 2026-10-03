/**
 * @module
 * Cart module manifest. Declares the module's routes, nav entry (with a badge that
 * seeds the cart count on auth), response schemas and locale loaders for the app
 * registry — see `AppModule`.
 */
import { computed, defineAsyncComponent, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ShoppingCart } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { useCartStore } from './store';
import { clearCheckoutDrafts } from './composables/use-checkout-draft';
import { useSessionStore } from '@/infrastructure/session.ts';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';

/**
 * The shopping cart, and the checkout that turns it into an order.
 *
 * Orders reaches the cart barrel for the reorder button, and wishlist for its move-to-cart exit;
both are `customer-supplier` or `conformist` — they ask this store to write a line or refetch.
The product page's "add to cart" arrives the other way round: this manifest contributes the
button to the `product-actions` slot the products module owns, so `products` never imports the
cart.

Four arrows go out. Three are `published-language`: `delivery`, whose `ShippingSelector` the
checkout mounts without ever learning what a shipping rate is; `payments`, whose
`PaymentMethodSelector` the checkout mounts the same way — this store never learns what a
payment method costs to offer, only which ids exist; and `account`, whose `AddressPicker` the
checkout mounts when the chosen method needs an address, reusing that module's own add-address
dialog rather than knowing anything about the address book itself.

The fourth, `products`, is `customer-supplier`: the cart page reads its lines' current title and
price from the products dictionary (`useProductLines`, one batched read) instead of asking per
line, and the products store owns the language reset those records need.

Checkout is the one screen where price, stock, address and shipping have to agree at once,
 * and the only place this client holds a multi-step flow of its own. Every other module points
 * at it.
 */
export default {
    name: 'cart',
    loadingKeys: ['cart'],
    routes,
    navigation: [
        {
            name: 'Cart',
            label: 'navigation.label-cart',
            plural: 1,
            order: 80,
            section: 'account',
            /*
             * A shop's cart is never behind a dropdown: pinned, it is its own button beside the
             * account menu on every width, wearing the count and the total below.
             */
            pinned: true,
            icon: ShoppingCart,
            /*
             * The Badge of the glossary above, finally worn. Runs inside the shell's setup, so
             * stores are reachable; seeds from the lightweight `GET /cart/summary` whenever a
             * session appears, because the whole point of that endpoint is a count that does not
             * cost the cart. Every later mutation keeps the count fresh through the store.
             */
            badge: () => {
                const cartStore = useCartStore();
                const session = useSessionStore();
                const { isAuth } = storeToRefs(session);
                /*
                 * Staff and administrators hold no cart key, so for them the summary read would be
                 * a 403. The abilities arrive a moment after the session does, so this watches the
                 * answer to "may this session shop", not the session alone.
                 */
                watch(
                    () => isAuth.value && session.can('update', 'Cart'),
                    (mayShop) => {
                        if (mayShop) void cartStore.fetchSummary();
                    },
                    { immediate: true }
                );
                watch(isAuth, (auth, wasAuth) => {
                    // Only the real end of a session: a reload starts signed out and is restored a
                    // moment later, and must keep its checkout draft.
                    if (wasAuth && !auth) clearCheckoutDrafts();
                });
                return storeToRefs(cartStore).badgeQuantity;
            },
            /*
             * The money beside the count. Formatted here, not in the store — a store holds
             * numbers, the chrome shows text — and inside a computed so it follows both the cart
             * and the active locale (`formatCurrency` reads the i18n locale ref).
             */
            detail: () => {
                const { badgeMoney } = storeToRefs(useCartStore());
                return computed(() =>
                    badgeMoney.value === undefined
                        ? undefined
                        : formatCurrency(badgeMoney.value.total, badgeMoney.value.currency)
                );
            }
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.cartResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // The product page's "add to cart": lazy, so the button does not join the eager entry chunk.
    slots: {
        'product-actions': [defineAsyncComponent(() => import('./components/AddToCartButton.vue'))]
    }
} satisfies AppModule;
