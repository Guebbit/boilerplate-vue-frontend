/**
 * @module
 * The link a notice carries, and the ONE place a notice target is resolved: a named target goes
 * through `linkIfRouted`, a path target through `resolve` plus the catch-all check. Either is
 * bound only when this build ships the screen and the reader may open it: a row must never link
 * where the reader would be refused (a role lost since the notice arrived).
 */
import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import type { NoticeTarget } from '@/kernel/registry';

/**
 * Builds the link-maker for one component. Call it from `setup`.
 *
 * @returns A function from a notice's target to its locale-prefixed page, or `undefined` when there
 *  is no target, the build ships no such route, or the session may not open it.
 */
export const useNotificationLink = () => {
    /**
     * The router, for `hasRoute` and to read the route's own permission.
     */
    const router = useRouter();

    /**
     * The session, which answers the route's `meta.can`.
     */
    const session = useSessionStore();

    /**
     * The target as a locale-prefixed location, or `undefined` when this build cannot show it.
     * A named target goes through `linkIfRouted` (the `hasRoute` guard); a path goes through
     * `resolve`, refused when nothing matches or only a catch-all does (an unshipped screen).
     *
     * @param target - The notice's target.
     */
    const located = (target: NoticeTarget): RouteLocationRaw | undefined => {
        if ('path' in target) {
            // The STRING form is resolved: a `{ path }` object would drop the query.
            const link = routerLinkI18n(target.path);
            const { matched } = router.resolve(link);
            return matched.length > 0 && !matched.some((record) => record.path.includes('catchAll'))
                ? link
                : undefined;
        }
        const named = linkIfRouted(router, target.route, target.params);
        return named ? routerLinkI18n(named) : undefined;
    };

    return (target?: NoticeTarget): RouteLocationRaw | undefined => {
        const link = target ? located(target) : undefined;
        if (!link) return undefined;

        const required = router.resolve(link).meta.can;
        return required && !session.can(required[0], required[1]) ? undefined : link;
    };
};
