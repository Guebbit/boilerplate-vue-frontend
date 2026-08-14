import type { AppModule } from '@/kernel/registry';
import { deliveryResponseSchemas } from './responseSchemas';

/**
 * Shipping methods, shipments and the fake courier — components, not pages.
 *
 * No routes and no navigation: the selector lives on the cart, the parcel panel on the order,
 * both mounted by their owners through this module's barrel (cart → delivery, orders →
 * delivery). Deleting this module removes the selector, the panels and the mock courier, and
 * checkouts simply stop carrying shipping — the state the shop was in before.
 */
export default {
    name: 'delivery',
    routes: [],
    responseSchemas: deliveryResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerDeliveryMockHandlers }) =>
                      registerDeliveryMockHandlers()
                  )
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
