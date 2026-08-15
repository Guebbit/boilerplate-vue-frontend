import type { AppModule } from '@/kernel/registry';
import { paymentsResponseSchemas } from './responseSchemas';

/**
 * The payment behind an order — a panel, not a page.
 *
 * No routes and no navigation: paying happens ON the order, so this module contributes the
 * `PaymentPanel` component (through its barrel) and the orders module mounts it — that arrow is
 * orders → payments, declared there. Deleting this module removes the panel, the pay flow and
 * the mock provider in one `rm -rf` plus one registry line, and orders go back to being paid
 * nowhere — the state the shop was in before.
 */
export default {
    name: 'payments',
    /*
     * Taking money is not this shop’s differentiator, and the provider is mocked. What stays is a
     * panel that belongs to an order.
     */
    subdomain: 'supporting',
    language: {
        Payment: 'The money behind one order. A panel on the order page, never a page of its own.',
        Provider:
            'The outside system that actually charges. Faked here, behind the same seam a real one would use.'
    },
    routes: [],
    responseSchemas: paymentsResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerPaymentsMockHandlers }) =>
                      registerPaymentsMockHandlers()
                  )
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
