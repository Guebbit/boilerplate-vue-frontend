/**
 * @module
 * Where an audit row's target lives in the app: the detail page of the record the action was taken
 * on, when an enabled module declared one (`AppModule.auditTargets`).
 */
import { auditTargetRouteOf } from '@/kernel/record-routes.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import type { RouteLocationRaw } from 'vue-router';

/**
 * A target id shortened to fit a table cell: the full id stays in the link's accessible name and
 * in the target filter.
 *
 * @param id - The row's `targetId`.
 */
export const shortTargetId = (id: string): string => id.slice(0, 8);

/**
 * The detail page of an audit row's target.
 *
 * @param router - The active router, for the `hasRoute` check.
 * @param targetType - The row's `targetType`, e.g. `order`.
 * @param targetId - The row's `targetId`.
 * @returns A location for the record's page, or `undefined` for a type without one, a row without
 *  a target, or a module this build does not ship.
 */
export const auditTargetLocation = (
    router: { hasRoute: (name: string) => boolean },
    targetType?: string,
    targetId?: string
): RouteLocationRaw | undefined => {
    const routeName = targetType ? auditTargetRouteOf(targetType) : undefined;
    // A type with no page (an API key, a locale entry, a session) falls through to plain text.
    return targetId && routeName ? linkIfRouted(router, routeName, { id: targetId }) : undefined;
};
