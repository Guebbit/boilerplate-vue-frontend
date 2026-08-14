import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { adminResponseSchemas } from './responseSchemas';

/**
 * The admin observability console: service health, KPIs and the audit log.
 *
 * Depends on nothing. It reads the observability endpoints directly rather than any other
 * domain's store, so dropping it costs nothing anywhere else — which is the point, since it is
 * the first thing a downstream project without an ops dashboard deletes.
 */
export default {
    name: 'admin',
    routes,
    navigation: [{ name: 'Admin', label: 'navigation.label-admin', plural: 1, order: 40 }],
    responseSchemas: adminResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerAdminMockHandlers }) =>
                      registerAdminMockHandlers()
                  )
            : undefined,
    // The data those handlers answer with — the `/observability/*` payloads. Same inline-ternary
    // rule as above, for the same reason: the fixtures must not reach a production bundle. Names no
    // `after`: operational telemetry derives from no domain's records.
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  build: (context) =>
                      import('./mocks/seeds').then(({ buildAdminMockSeeds }) =>
                          buildAdminMockSeeds(context)
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
