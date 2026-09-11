/**
 * @module
 * Module manifest: wires the webhooks routes, nav entries, response schemas and locale loaders
 * into the app's module registry.
 */
import { Webhook, History } from 'lucide-vue-next';
import { dictionary } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';
import { webhooksResponseSchemas } from './response-schemas';

/**
 * Webhook subscription management: who gets notified of what, the signing secret ring, and the
 * delivery log behind it.
 *
 * Depends on nothing. The subscriptions and deliveries it manages are produced by orders and
 * payments on the backend's own domain-event bus — this module never imports either of theirs.
 *
 * Two nav entries, not one: subscriptions (creating/rotating/removing) and the delivery log
 * (reading/replaying) are different jobs an operator reaches for at different times, same split
 * the `feedback` module uses for its public form vs. its admin inbox.
 */
export default {
    name: 'webhooks',
    routes,
    navigation: [
        {
            name: 'WebhooksList',
            label: 'navigation.label-webhooks',
            plural: 2,
            order: 48,
            section: 'admin',
            icon: Webhook
        },
        {
            name: 'WebhookDeliveries',
            label: 'navigation.label-webhook-deliveries',
            plural: 1,
            order: 49,
            section: 'admin',
            icon: History
        }
    ],
    responseSchemas: webhooksResponseSchemas,
    locales: {
        en: () => import('./locales/en.json').then(dictionary),
        it: () => import('./locales/it.json').then(dictionary)
    }
} satisfies AppModule;
