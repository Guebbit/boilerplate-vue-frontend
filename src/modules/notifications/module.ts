/**
 * @module
 * Notifications module manifest. Declares no routes and no menu entry: the module is a bell that
 * the shell's app bar hosts through the `app-bar` slot, plus the response schemas and locale
 * loaders for the app registry — see `AppModule`.
 */
import { defineAsyncComponent } from 'vue';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';

/**
 * The signed-in visitor's inbox: messages the server keeps until the owner deletes them, filled
 * into the toolkit's message store, pushed live over SSE, and shown in a bell in the app bar.
 *
 * Depends on no sibling. The server writes a notification when a product vanishes from a cart or
 * a wishlist, or when a guest-cart merge refuses a line, and this module only reads and renders
 * what arrives, so no producer module is imported here and none imports this one.
 *
 * A courtesy surface. Deleting it costs the reader a message, never a capability.
 */
export default {
    name: 'notifications',
    routes: [],
    responseSchemas: () => import('./response-schemas').then((m) => m.notificationsResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // The bell: lazy, so the panel and its store do not join the eager entry chunk.
    slots: {
        'app-bar': [defineAsyncComponent(() => import('./components/NotificationsBell.vue'))]
    }
} satisfies AppModule;
