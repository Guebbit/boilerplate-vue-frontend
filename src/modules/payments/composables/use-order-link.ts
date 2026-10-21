/**
 * @module
 * The order link a payments row carries. `orders` is not an edge of this module, so the link is
 * built only when the route exists (`linkIfRouted`); a build without `orders` renders plain text.
 */
import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';

/**
 * Builds the link-maker for one component.
 *
 * @returns A function from an order id to its locale-prefixed page, or `undefined` when the app
 *  serves no order page.
 */
export const useOrderLink = () => {
    /**
     * The router, for the `hasRoute` guard.
     */
    const router = useRouter();

    return (orderId: string): RouteLocationRaw | undefined => {
        const target = linkIfRouted(router, 'OrderTarget', { id: orderId });
        return target ? routerLinkI18n(target) : undefined;
    };
};
