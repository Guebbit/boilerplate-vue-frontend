import { Users } from 'lucide-vue-next';
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
    routes,
    navigation: [
        {
            name: 'UsersList',
            label: 'navigation.label-users-list',
            plural: 2,
            order: 50,
            section: 'admin',
            icon: Users
        }
    ],
    responseSchemas: usersResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
