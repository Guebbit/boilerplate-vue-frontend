import { FlaskConical } from 'lucide-vue-next';
import type { AppModule } from '@/kernel/registry';
import routes from './routes';

/** What makes `logger.debug('demo', …)` type-check. Deleting this folder takes the scope with it. */
declare module '@/infrastructure/utils/logger.ts' {
    // The name belongs to the module being augmented, not to this one: declaration merging only
    // works against the exact interface it declares.
    interface LogScopes {
        demo: true;
    }
}

/**
 * The boilerplate's own showroom: one page exercising the store, the toolkit components, the
 * notification toasts and the provide/inject demo, plus the teaching route guard.
 *
 * A module rather than part of the app shell, because that is what makes it DELETABLE — `rm -rf`
 * this folder and one line of `src/modules.ts`, and the demo leaves with it. Nothing depends on
 * it, and it depends on no domain.
 */
export default {
    name: 'demo',
    // A showroom is not the business. There is nothing to model here.
    subdomain: 'generic',
    routes,
    navigation: [
        {
            name: 'Playground',
            label: 'navigation.label-playground',
            plural: 1,
            order: 20,
            section: 'main',
            icon: FlaskConical
        }
    ],
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies AppModule;
