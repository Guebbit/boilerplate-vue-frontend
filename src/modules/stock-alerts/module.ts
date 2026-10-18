/**
 * @module
 * Stock alerts module manifest. The "Notify me" request a shopper makes where a product cannot be
 * ordered, contributed to the product page and card through the `product-actions` slot, and the
 * list of their open requests in the account.
 */
import { defineAsyncComponent } from 'vue';
import { Bell } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * Back-in-stock requests.
 *
 * One arrow goes out: `products` is `conformist`, because the button reads the product's shelf
 * state from the products domain. The reverse arrow does not exist: the button is contributed to
 * the `product-actions` slot by this manifest, so `products` never imports it. Deleting the folder
 * costs a convenience, not a capability.
 */
export default {
    name: 'stock-alerts',
    loadingKeys: ['stock-alerts'],
    routes,
    navigation: [
        {
            name: 'StockAlerts',
            label: 'navigation.label-stock-alerts',
            plural: 1,
            order: 76,
            section: 'account',
            icon: Bell
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.stockAlertsResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // The product page's and card's button: lazy, so it does not join the eager entry chunk.
    slots: {
        'product-actions': [defineAsyncComponent(() => import('./components/NotifyMeButton.vue'))]
    }
} satisfies AppModule;
