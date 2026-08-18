import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { localesResponseSchemas } from './responseSchemas';

/**
 * The translation admin surface: which languages exist, and what has been edited into them.
 *
 * The CONSUMER half of the dynamic tier lives in `infrastructure/i18n/localeOverrides.ts` and
 * needs no module — every visitor's locale switch reads it. This module is the AUTHOR half: the
 * screens a translator edits through. Deleting it removes the screens and nothing else; every
 * language already translated keeps rendering, because rendering never depended on it.
 *
 * Depends on nothing. It talks only to `/locales/*`, and the two infrastructure reads it shares
 * with the boot path (`GET /locales`, `GET /locales/{tag}/messages`) stay registered by the
 * bottom tier precisely so this folder can be `rm -rf`ed without touching them.
 */
export default {
    name: 'locales',
    /*
     * Translation management is a solved problem — every CMS grows one of these screens and none
     * of them differ. The modelling effort lives server-side, where the rows are.
     */
    subdomain: 'generic',
    language: {
        Language:
            'A tag registered in the dynamic tier. Its existence means entries can be translated into it — never that the API can answer in it, which needs a deployed file.',
        Entry: 'One translated string, identified by (language, scope, key). Flat and dotted; the nested tree is built by the server.',
        Scope: 'Which of the two dictionaries a row overrides. `app` is this frontend’s words, `api` is the backend’s. Separate keyspaces — the same key in both is two unrelated strings.',
        Revision:
            'A language’s version counter, bumped by every write. What a client caches against.'
    },
    routes,
    navigation: [{ name: 'LocalesList', label: 'navigation.label-locales', plural: 2, order: 43 }],
    responseSchemas: localesResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerLocalesAdminMockHandlers }) =>
                      registerLocalesAdminMockHandlers()
                  )
            : undefined,
    // The seed slice those handlers edit — the dynamic-tier rows and their entries. Same
    // inline-ternary rule as above: the fixtures must not reach a production bundle.
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  build: () =>
                      import('./mocks/register').then(({ buildLocalesMockSeeds }) =>
                          buildLocalesMockSeeds()
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
