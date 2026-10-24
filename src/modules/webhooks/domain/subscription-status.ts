/**
 * @module
 * The one place a subscription's three states are told apart. The server stores two timestamps
 * (`disabledAt`, and `autoDisabledAt` only when its failure guard did it) and derives `enabled`;
 * the screen reads them as three states, because "paused by hand" and "switched off after repeated
 * failures" ask different things of the visitor.
 */
import type { WebhookSubscription } from '@types';

/**
 * Why a subscription is or is not delivering.
 */
export type SubscriptionStatus = 'enabled' | 'paused' | 'auto-disabled';

/**
 * The state a subscription is in, read off its wire fields.
 *
 * @param subscription - The fields that decide it: the derived `enabled`, and `autoDisabledAt`.
 * @returns `enabled`; `auto-disabled` when the failure guard switched it off; `paused` otherwise.
 */
export const subscriptionStatusOf = (
    subscription: Pick<WebhookSubscription, 'enabled' | 'autoDisabledAt'>
): SubscriptionStatus => {
    if (subscription.enabled) return 'enabled';
    return subscription.autoDisabledAt ? 'auto-disabled' : 'paused';
};

/**
 * The two server filters a status is made of: `enabled` (switched on or off) and `autoDisabled`
 * (switched off by the failure guard, or not).
 */
export interface SubscriptionStatusFilter {
    enabled?: boolean;
    autoDisabled?: boolean;
}

/**
 * The server filters that select one status. Paused is "off, and not by the guard"; no status
 * leaves both unset.
 *
 * @param status - The status the visitor picked, or `undefined` for "any".
 */
export const filterOfStatus = (
    status: SubscriptionStatus | undefined
): SubscriptionStatusFilter => {
    if (status === undefined) return {};
    if (status === 'enabled') return { enabled: true };
    return { enabled: false, autoDisabled: status === 'auto-disabled' };
};

/**
 * The status the current server filters amount to: the inverse of {@link filterOfStatus}, for a
 * filter that arrived from the URL.
 *
 * @param filter - The store's current filters.
 * @returns The matching status, or `undefined` when the filters do not select exactly one.
 */
export const statusOfFilter = (
    filter: SubscriptionStatusFilter
): SubscriptionStatus | undefined => {
    if (filter.enabled === true) return 'enabled';
    if (filter.autoDisabled === true) return 'auto-disabled';
    return filter.enabled === false ? 'paused' : undefined;
};
