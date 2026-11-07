/**
 * @module
 * App-module manifest: a plain object satisfying `AppModule`. No routes, no navigation, no
 * locales: the module loads the shop's settings at boot and validates their response.
 */

import type { AppModule } from '@/kernel/registry';
import { loadShop } from './shop';

/**
 * The shop's settings, loaded once at boot.
 *
 * Page-less and owned by the shop group: deleting it (`npm run demo:remove`) removes the load and
 * its readers together, and the core, which reads `GET /config`, never notices.
 *
 * Context map: `docs/modules/shop.md`.
 */
export default {
    name: 'shop',
    routes: [],
    responseSchemas: () => import('./response-schemas').then((m) => m.shopResponseSchemas),
    setup: () => {
        // loadShop never rejects (it logs and leaves the shop empty), so a floating promise is safe.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises -- see above
        void loadShop();
    }
} satisfies AppModule;
