import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ShoppingCart } from 'lucide-vue-next';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { cartResponseSchemas } from './response-schemas';
import { useCartStore } from './store';
import { useSessionStore } from '@/infrastructure/stores/session.ts';

/**
 * The shopping cart, and the checkout that turns it into an order.
 *
 * Nearly every arrow points AT this module: orders reaches the cart barrel for the reorder button,
 * products for "add to cart", wishlist for its move-to-cart exit. The first two are
 * `customer-supplier` — they ask this store to write a line — and `wishlist` is `conformist`: the
 * move itself is a wishlist endpoint, and this store is only asked to refetch. Either way the cart
 * is the one publishing a store, while the modules it depends on publish components and schemas.
 *
 * The one arrow going out is `delivery`, and it is `published-language`: the checkout mounts
 * `ShippingSelector` and never learns what a shipping rate is.
 */
export default {
    name: 'cart',
    /*
     * Checkout is the one screen where price, stock, address and shipping have to agree at once,
     * and the only place this client holds a multi-step flow of its own. Every other module points
     * at it.
     */
    routes,
    navigation: [
        {
            name: 'Cart',
            label: 'navigation.label-cart',
            plural: 1,
            order: 80,
            section: 'account',
            icon: ShoppingCart,
            /*
             * The Badge of the glossary above, finally worn. Runs inside the shell's setup, so
             * stores are reachable; seeds from the lightweight `GET /cart/summary` whenever a
             * session appears, because the whole point of that endpoint is a count that does not
             * cost the cart. Every later mutation keeps the count fresh through the store.
             */
            badge: () => {
                const cartStore = useCartStore();
                const { isAuth } = storeToRefs(useSessionStore());
                watch(
                    isAuth,
                    (auth) => {
                        if (auth) void cartStore.fetchSummary();
                    },
                    { immediate: true }
                );
                return storeToRefs(cartStore).badgeQuantity;
            }
        }
    ],
    responseSchemas: cartResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
