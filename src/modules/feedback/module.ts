/**
 * @module
 * Module manifest: wires the feedback routes, nav entries, response schemas
 * and locale loaders into the app's module registry.
 */
import { Inbox, Mail } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { feedbackResponseSchemas } from './response-schemas';

/**
 * The contact form and its admin inbox.
 *
 * Depends on nothing: a ticket references no other domain's records, and both views talk only
 * to this module's own endpoints. The BE module has answered them all along — this is the
 * frontend finally claiming its half.
 *
 * A contact form and an inbox. Every application grows one, none of them differ, and this one
 * references no other domain’s records.
 */
export default {
    name: 'feedback',
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
            name: 'FeedbackInbox',
            label: 'navigation.label-feedback',
            plural: 1,
            order: 45,
            section: 'admin',
            icon: Inbox
        }
    ],
    responseSchemas: feedbackResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
