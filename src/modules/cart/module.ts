import { watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { cartResponseSchemas } from './response-schemas';
import { useCartStore } from './store';
import { useSessionStore } from '@/infrastructure/stores/session.ts';

/**
 * The shopping cart, and the checkout that turns it into an order.
 *
 * Nearly every arrow points AT this module: orders reaches the cart barrel for the reorder button,
 * wishlist for its move-to-cart exit, products for "add to cart". All three are
 * `customer-supplier` — they ask this store to write a line — which is why the cart publishes a
 * store while the modules it depends on publish components and schemas.
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
    subdomain: 'core',
    language: {
        Cart: 'A VIEW of the server’s cart, not a second copy of it. Every mutation is a request; the store holds the answer.',
        'Cart line':
            'A product and a quantity, as the API returns them. Prices come down with the response — this client never computes one.',
        Checkout:
            'The flow that turns the cart into an order: address, shipping, payment. The steps are this module’s; the rules are not.',
        Badge: 'The header’s item count. The reason siblings refresh this store after writing to it.'
    },
    dependsOn: [
        {
            module: 'delivery',
            as: 'published-language',
            because:
                'Mounts `ShippingSelector`, a self-contained component that renders shipping without this module learning what a rate is.'
        }
    ],
    routes,
    navigation: [
        {
            name: 'Cart',
            label: 'navigation.label-cart',
            plural: 1,
            order: 80,
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
