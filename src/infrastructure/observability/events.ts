import { analyticsEvents as sharedAnalyticsEvents } from '@/infrastructure/analyticsEvents.ts';

/**
 * The analytics catalog this app emits from: the names shared with the backend, plus the ones
 * only a client has.
 *
 * The shared half comes from `analyticsEvents.ts`, which is byte-identical in both repos and
 * guarded by `npm run check:spec-identity`, so the two sides of a funnel cannot drift apart.
 */

/** Events only this app can emit: the backend has no equivalent moment to report. */
const frontendOnlyAnalyticsEvents = {
    // Application lifecycle — there is no "app started" on a server that is always started.
    APP_STARTED: 'app_started',
    APP_READY: 'app_ready',

    // Logging out is a client-side token discard; the API has no request to attribute it to.
    USER_LOGGED_OUT: 'user_logged_out'
} as const;

export const analyticsEvents = {
    ...sharedAnalyticsEvents,
    ...frontendOnlyAnalyticsEvents
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];
