import { IdCard } from 'lucide-vue-next';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { accountResponseSchemas } from './response-schemas';

/**
 * The visitor's own account: login, signup, profile, password reset and account deletion.
 *
 * `dependsOn: ['users']` is the field rules, not the screens — every form here validates against
 * `usersSchema`/`usersPasswordSchema` from the users barrel, so that "what makes a valid username"
 * is answered once for the person editing their own record and for the admin editing someone
 * else's. A build with account but not users would validate nothing.
 *
 * The session itself is not in here: the token lives in `infrastructure/session`, because
 * `infrastructure/http` has to read it on every request and the router guards have to read
 * `isAuth`/`isAdmin` before any domain code runs. This module owns the user's editable record.
 *
 * There is no `index.ts` next to this file, and that is the answer rather than an omission: account
 * is a consumer, not a provider, and no other domain has ever needed anything from it. A barrel
 * exists when a module exports something; an empty one would only be a promise nobody asked for.
 */
export default {
    name: 'account',
    /*
     * Login, signup, password reset. There is no version of this that is a competitive advantage,
     * and the client half is thinner still — it renders forms over rules the server owns.
     */
    subdomain: 'generic',
    routes,
    dependsOn: [
        {
            module: 'users',
            as: 'published-language',
            because:
                'Validates every form against `usersSchema`/`usersPasswordSchema` — shared field rules, not a shared store.'
        }
    ],
    navigation: [
        {
            name: 'Profile',
            label: 'navigation.label-profile',
            plural: 2,
            order: 70,
            section: 'account',
            icon: IdCard
        }
    ],
    responseSchemas: accountResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
