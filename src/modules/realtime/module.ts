import type { IAppModule } from '@/kernel/registry';
import routes from './routes';

/**
 * The realtime playground: a live view of the observability metrics stream.
 *
 * Depends on nothing. The SSE transport it runs on is not part of this module — `createSseClient`
 * is a typed wrapper over `EventSource` that knows no domain, so it lives in `infrastructure` and this module
 * is only the screen, the store behind it and the feed component.
 */
export default {
    name: 'realtime',
    routes,
    navigation: [
        { name: 'RealtimePlayground', label: 'navigation.label-realtime', plural: 1, order: 30 }
    ],
    locales: {
        en: () => import('./locales/en.json').then(({ default: dictionary }) => dictionary),
        it: () => import('./locales/it.json').then(({ default: dictionary }) => dictionary)
    }
} satisfies IAppModule;
