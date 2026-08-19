import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { usersResponseSchemas } from './response-schemas';

/**
 * User administration: the admin-only list, detail, create and edit screens.
 *
 * Depends on nothing. It is the account module that reads this one — for the field rules every
 * signup and password form shares — and not the reverse: a user record exists whether or not
 * anyone is signed in.
 */
export default {
    name: 'users',
    /*
     * An admin CRUD over a user record with an email and an admin flag — the same problem in every
     * application that has ever had one.
     */
    subdomain: 'generic',
    language: {
        User: 'The person record, admin-facing. The same row `account` edits from the inside.',
        Admin: 'A flag on the User, not a role table. Two levels of access is the whole model.',
        'Field rules':
            'The Zod schemas every user-shaped form validates against. This module’s one export, and the reason `account` depends on it.'
    },
    routes,
    navigation: [{ name: 'UsersList', label: 'navigation.label-users-list', plural: 2, order: 50 }],
    responseSchemas: usersResponseSchemas,
    // Written out rather than delegated to a helper on purpose: `import.meta.env` is replaced by
    // a literal at build time, so this ternary is what lets the bundler drop the mock chunk (and
    // MSW with it) from a production build. See `collectModuleMockHandlers`.
    mockHandlers:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? () =>
                  import('./mocks/handlers').then(({ registerUsersMockHandlers }) =>
                      registerUsersMockHandlers()
                  )
            : undefined,
    // The data those handlers answer with. Same inline-ternary rule as above, for the same reason:
    // the fixtures must not reach a production bundle. Names no `after` — a user record derives
    // from no other domain's data.
    mockSeeds:
        import.meta.env.VITE_API_MOCK_ENABLED === 'true'
            ? {
                  build: () =>
                      import('./mocks/register').then(({ buildUsersMockSeeds }) =>
                          buildUsersMockSeeds()
                      )
              }
            : undefined,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
