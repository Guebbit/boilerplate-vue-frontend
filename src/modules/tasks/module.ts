/**
 * @module
 * Module manifest: wires the tasks routes, nav entries, response schemas
 * and locale loaders into the app's module registry.
 */
import { Inbox, Mail } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { useTaskBadge } from './composables/use-task-badge';

/**
 * The contact form and its admin tasks page.
 *
 * Depends on nothing: a task references no other domain's records, and both views talk only
 * to this module's own endpoints.
 *
 * A contact form and an inbox. Every application grows one, none of them differ, and this one
 * references no other domain’s records.
 *
 * Context map: `docs/modules/tasks.md` § "The map".
 *
 * Subdomain: `generic`.
 */
export default {
    name: 'tasks',
    loadingKeys: ['tasks'],
    routes,
    navigation: [
        {
            name: 'Contact',
            label: 'navigation.label-contact',
            plural: 1,
            order: 95,
            section: 'main',
            icon: Mail
        },
        {
            name: 'TaskInbox',
            label: 'navigation.label-tasks',
            plural: 1,
            order: 45,
            section: 'admin',
            icon: Inbox,
            // Tasks waiting for someone plus the ones the viewer holds; see the composable.
            badge: () => useTaskBadge()
        }
    ],
    responseSchemas: () => import('./response-schemas').then((m) => m.tasksResponseSchemas),
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
