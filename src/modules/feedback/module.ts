import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { feedbackResponseSchemas } from './responseSchemas';

/**
 * The contact form and its admin inbox.
 *
 * Depends on nothing: a ticket references no other domain's records, and both views talk only
 * to this module's own endpoints. The BE module has answered them all along — this is the
 * frontend finally claiming its half.
 */
export default {
    name: 'feedback',
    routes,
    navigation: [
        { name: 'Contact', label: 'navigation.label-contact', plural: 1, order: 95 },
        { name: 'FeedbackInbox', label: 'navigation.label-feedback', plural: 1, order: 45 }
    ],
    responseSchemas: feedbackResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerFeedbackMockHandlers }) =>
                      registerFeedbackMockHandlers()
                  )
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
