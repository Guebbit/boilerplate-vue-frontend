/**
 * @module
 * The link a work notice carries into the admin. A sibling's screen is reached by route name, only
 * when this build ships it, and only when the reader may open it: a row must never link where the
 * reader would be refused (a role lost since the notice arrived).
 */
import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import type { NotificationTarget } from '../domain';

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
     * The target's route if this build ships it. The names are written out here, beside the
     * `hasRoute` guard, so the coupling is visible where it is made.
     *
     * @param target - The screen and id.
     * @returns A named location, or `undefined` when the route does not exist.
     */
    const routed = (target: NotificationTarget) => {
        switch (target.screen) {
            case 'account': {
                return linkIfRouted(router, 'UserTarget', { id: target.id });
            }
            case 'ticket': {
                return linkIfRouted(router, 'TicketDetail', { id: target.id });
            }
            case 'webhook-subscription': {
                return linkIfRouted(router, 'WebhookTarget', { id: target.id });
            }
            case 'return': {
                return linkIfRouted(router, 'ReturnTarget', { id: target.id });
            }
            case 'order': {
                return linkIfRouted(router, 'OrderTarget', { id: target.id });
            }
            case 'sales-orders': {
                return linkIfRouted(router, 'SalesOrders');
            }
            case 'payments': {
                return linkIfRouted(router, 'PaymentsList');
            }
            case 'returns': {
                return linkIfRouted(router, 'SalesReturns');
            }
            case 'preorders': {
                return linkIfRouted(router, 'PreordersBoard');
            }
            case 'inventory': {
                return linkIfRouted(router, 'InventoryLedger');
            }
        }
    };

    return (target?: NotificationTarget): RouteLocationRaw | undefined => {
        const located = target ? routed(target) : undefined;
        if (!located) return undefined;

        const link = routerLinkI18n(located);
        const required = router.resolve(link).meta.can;
        return required && !session.can(required[0], required[1]) ? undefined : link;
    };
};
