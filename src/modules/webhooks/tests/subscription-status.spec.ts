/**
 * `subscriptionStatusOf` — the one place the three states are told apart: switched on, paused by
 * hand (`disabledAt` only), and switched off by the server's failure guard (`autoDisabledAt` too).
 */
import { describe, expect, it } from 'vitest';
import {
    filterOfStatus,
    statusOfFilter,
    subscriptionStatusOf,
    type SubscriptionStatus
} from '../domain/subscription-status.ts';

describe('subscriptionStatusOf', () => {
    it.each([
        [{ enabled: true }, 'enabled'],
        [{ enabled: false }, 'paused'],
        [{ enabled: false, autoDisabledAt: '2026-02-01T00:00:00.000Z' }, 'auto-disabled']
    ] as const)('reads %j as %s', (fields, expected) => {
        expect(subscriptionStatusOf(fields)).toBe(expected);
    });

    it('calls a subscription enabled whatever autoDisabledAt says: enabled is the truth', () => {
        expect(
            subscriptionStatusOf({ enabled: true, autoDisabledAt: '2026-02-01T00:00:00.000Z' })
        ).toBe('enabled');
    });
});

describe('the status filter', () => {
    it.each([
        [undefined, {}],
        ['enabled', { enabled: true }],
        ['paused', { enabled: false, autoDisabled: false }],
        ['auto-disabled', { enabled: false, autoDisabled: true }]
    ] as const)('maps %s to %j and back', (status, filter) => {
        expect(filterOfStatus(status)).toEqual(filter);
        expect(statusOfFilter(filter)).toBe(status);
    });

    it('reads a URL-borne filter that selects no single status as "any"', () => {
        expect(statusOfFilter({ autoDisabled: false })).toBeUndefined();
    });

    it('reads off, not by the guard, as paused even when autoDisabled is absent', () => {
        const status: SubscriptionStatus | undefined = statusOfFilter({ enabled: false });
        expect(status).toBe('paused');
    });
});
