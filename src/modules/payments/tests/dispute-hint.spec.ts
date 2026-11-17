/**
 * @module
 * `disputeHintFor`: which of the two allowed buttons a refund refused as disputed should use.
 */
import { describe, expect, it } from 'vitest';
import type { Dispute } from '@types';
import { disputeHintFor } from '../dispute-hint.ts';

/** A dispute of the given kind and status, with the fields the hint ignores filled in. */
const dispute = (kind: Dispute['kind'], status: Dispute['status']): Dispute => ({
    disputeRef: 'dp_1',
    kind,
    status,
    reason: 'fraudulent',
    amount: '50.00',
    currency: 'EUR',
    fundsWithdrawn: true,
    openedAt: '2026-03-05T10:00:00Z',
    observedAt: '2026-03-05T10:00:00Z'
});

/** A refund the bank's dispute refused. */
const DISPUTED = { failureReason: 'disputed' } as const;

describe('disputeHintFor', () => {
    it.each([['lost'], ['accepted']] as const)(
        'points to Mark returned after a %s chargeback',
        (status) => {
            expect(disputeHintFor({ disputes: [dispute('chargeback', status)] }, DISPUTED)).toBe(
                'lost'
            );
        }
    );

    it('points to Cancel refund after a won chargeback', () => {
        expect(disputeHintFor({ disputes: [dispute('chargeback', 'won')] }, DISPUTED)).toBe('won');
    });

    it('prefers lost when one chargeback was lost and another won', () => {
        const disputes = [dispute('chargeback', 'won'), dispute('chargeback', 'lost')];
        expect(disputeHintFor({ disputes }, DISPUTED)).toBe('lost');
    });

    it('suggests nothing for an inquiry, an open chargeback or no dispute on file', () => {
        expect(
            disputeHintFor({ disputes: [dispute('inquiry', 'lost')] }, DISPUTED)
        ).toBeUndefined();
        expect(
            disputeHintFor({ disputes: [dispute('chargeback', 'needs_response')] }, DISPUTED)
        ).toBeUndefined();
        expect(disputeHintFor({}, DISPUTED)).toBeUndefined();
    });

    it('suggests nothing for a refund refused for another reason', () => {
        expect(
            disputeHintFor(
                { disputes: [dispute('chargeback', 'lost')] },
                { failureReason: 'declined' }
            )
        ).toBeUndefined();
    });
});
