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
 * Other modules reach the cart barrel (`orders` for the reorder button, `wishlist` for its
 * move-to-cart exit). The product page's "add to cart" arrives the other way round: this manifest
 * contributes the button to the `product-actions` slot the products module owns, so `products`
 * never imports the cart.
 *
 * Checkout is the one screen where price, stock, address and shipping have to agree at once, and
 * the only place this client holds a multi-step flow of its own. Every other module points at it.
 *
 * Context map: `docs/modules/cart.md` § "The map".
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
             * stores are reachable; whenever a session that may shop appears it merges the guest
             * cart in, or seeds from the lightweight `GET /cart/summary` when there is none,
             * because the whole point of that endpoint is a count that does not cost the cart.
             * Every later mutation keeps the count fresh through the store. A guest's badge is
             * their own list's total.
             */
            badge: () => {
                const cartStore = useCartStore();
                const session = useSessionStore();
                const { isAuth } = storeToRefs(session);
                /*
                 * Staff and administrators hold no cart key, so for them the summary read would be
                 * a 403. The abilities arrive a moment after the session does, so this watches the
                 * answer to "may this session shop", not the session alone. It watches WHO may
                 * shop, not whether someone does: another account taking the tab over with no
                 * sign-out between keeps the answer "yes", and still needs its own seed. `flush:
                 * 'post'` runs it after the store's own per-person reset, so the seed lands on a
                 * store already emptied of the previous person.
                 */
                watch(
                    () =>
                        isAuth.value && session.can('update', 'Cart')
                            ? session.viewer?.id
                            : undefined,
                    (shopperId) => {
                        if (shopperId !== undefined) void cartStore.seedAfterSignIn();
                    },
                    { immediate: true, flush: 'post' }
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
    tours: [
        {
            tour: 'checkout',
            id: 'lines',
            target: 'checkout-lines',
            title: 'cart-tour.lines-title',
            body: 'cart-tour.lines-body',
            order: 10
        },
        {
            tour: 'checkout',
            id: 'summary',
            target: 'checkout-summary',
            title: 'cart-tour.summary-title',
            body: 'cart-tour.summary-body',
            order: 20
        },
        {
            tour: 'checkout',
            id: 'notes',
            target: 'checkout-notes',
            title: 'cart-tour.notes-title',
            body: 'cart-tour.notes-body',
            order: 30
        },
        {
            tour: 'checkout',
            id: 'total',
            target: 'checkout-total',
            title: 'cart-tour.total-title',
            body: 'cart-tour.total-body',
            order: 40
        },
        {
            tour: 'checkout',
            id: 'place-order',
            target: 'checkout-place-order',
            title: 'cart-tour.place-order-title',
            body: 'cart-tour.place-order-body',
            order: 50
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
