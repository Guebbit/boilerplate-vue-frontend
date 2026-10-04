/**
 * @module
 * `sseEventNamesOf`: one stream's slice of the contract's flat SSE event list.
 */
import { describe, expect, it } from 'vitest';
import { sseEventNamesOf } from '@/infrastructure/sse-event-names';

describe('sseEventNamesOf', () => {
    it("keeps only the events of the namespace it is asked for, whole and in the contract's order", () => {
        expect(sseEventNamesOf('observability')).toEqual([
            'observability.heartbeat',
            'observability.metrics.snapshot',
            'observability.metrics.updated'
        ]);
    });

    it('does not let a namespace match another that merely starts with the same letters', () => {
        // The prefix is matched with its dot, so a bare stem selects nothing.
        expect(sseEventNamesOf('observab')).toEqual([]);
    });

    it('answers an empty list for a namespace the contract has no stream for', () => {
        expect(sseEventNamesOf('nothing-here')).toEqual([]);
    });
});
