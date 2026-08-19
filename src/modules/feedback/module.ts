import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { feedbackResponseSchemas } from './response-schemas';

/**
 * The contact form and its admin inbox.
 *
 * Depends on nothing: a ticket references no other domain's records, and both views talk only
 * to this module's own endpoints. The BE module has answered them all along — this is the
 * frontend finally claiming its half.
 */
export default {
    name: 'feedback',
    /*
     * A contact form and an inbox. Every application grows one, none of them differ, and this one
     * references no other domain’s records.
     */
    subdomain: 'generic',
    language: {
        'Contact request':
            'A message from anyone, account or not. Identified by the email on the form.',
        Inbox: 'The admin side of the same collection. Triage, nothing more.'
    },
    routes,
    navigation: [
        { name: 'Contact', label: 'navigation.label-contact', plural: 1, order: 95 },
        { name: 'FeedbackInbox', label: 'navigation.label-feedback', plural: 1, order: 45 }
    ],
    responseSchemas: feedbackResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
