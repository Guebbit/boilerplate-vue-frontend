/**
 * @module
 * Shop-tasks module manifest. Declares no routes and no menu entry: it is the shop's words and
 * links for the notices the foundation's bell shows, plus the shop's half of the task labels
 * (`task-kind`, `task-category`, `task-link`), which the tasks screens read, and the feed of the
 * staff nav badge counts (`GET /shop-tasks/summary`, read by the screens through `@/kernel/work-counts`).
 */
import { defineAsyncComponent } from 'vue';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import { shopNotices } from './notices';

/**
 * The shop's to-dos and notices on the client: how each `shop-tasks.*` notification code reads and
 * where it links, and the labels of the shop's task kinds, categories and link types.
 *
 * Depends on no sibling. A link names a sibling's route and the bell binds it only when this
 * build ships that route, so removing the sibling removes the link and nothing else.
 *
 * Deleting it costs the shop's notices their wording (they read as a generic notification), never
 * the bell or the tasks inbox.
 *
 * Subdomain: `supporting`.
 */
export default {
    name: 'shop-tasks',
    routes: [],
    notices: shopNotices,
    // The staff pages a task linked to an order or a return opens, named like the notices' links.
    recordRoutes: { order: 'OrderTarget', return: 'ReturnTarget' },
    responseSchemas: () => import('./response-schemas').then((m) => m.shopTasksResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    },
    // The feed behind the staff nav badges: mounted with the shell, renders nothing.
    slots: {
        'app-bar': [defineAsyncComponent(() => import('./components/ShopWorkFeed.vue'))]
    }
} satisfies AppModule;
