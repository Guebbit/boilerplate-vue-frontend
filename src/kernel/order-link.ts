/**
 * @module
 * The link to a staff or customer order page, for a module that is not `orders`. `orders` is a
 * sibling, so the route is reached by name and only when the build ships it (`linkIfRouted`); a
 * build without `orders` gets no link, and the caller renders plain text.
 */
import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';

/**
 * Builds the link-maker for one component. Call it from `setup`.
 *
 * @returns A function from an order id to its locale-prefixed page, or `undefined` when the id is
 *  absent or the app serves no order page.
 */
export const useOrderLink = () => {
    /**
     * The router, for the `hasRoute` guard.
     */
    const router = useRouter();

    return (orderId?: string | null): RouteLocationRaw | undefined => {
        const target = orderId ? linkIfRouted(router, 'OrderTarget', { id: orderId }) : undefined;
        return target ? routerLinkI18n(target) : undefined;
    };
};

/**
 * Builds the link-maker from an order NUMBER (as a customer quotes it) to the staff orders list
 * filtered to it. Call it from `setup`.
 *
 * @returns A function from a number to the locale-prefixed filtered list, or `undefined` when the
 *  number is absent or the app serves no staff orders page.
 */
export const useOrderNumberLink = () => {
    /**
     * The router, for the `hasRoute` guard.
     */
    const router = useRouter();

    return (orderNumber?: string | null): RouteLocationRaw | undefined => {
        const target = orderNumber
            ? linkIfRouted(router, 'SalesOrders', undefined, { orderNumber })
            : undefined;
        return target ? routerLinkI18n(target) : undefined;
    };
};
