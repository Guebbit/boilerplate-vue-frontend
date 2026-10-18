/**
 * @module
 * `asPassive`: the header merge every self-made read (refresh, abilities, notifications sync)
 * goes through, so the server does not count it as the person acting.
 */
import { describe, expect, it } from 'vitest';
import { asPassive } from '@/infrastructure/http/passive.ts';

describe('asPassive', () => {
    it('adds the header to an empty config', () => {
        expect(asPassive()).toEqual({ headers: { 'X-Session-Passive': 'true' } });
    });

    it('keeps what the caller already set, headers included', () => {
        const merged = asPassive({ timeout: 5, headers: { 'X-Other': '1' } });

        expect(merged).toEqual({
            timeout: 5,
            headers: { 'X-Other': '1', 'X-Session-Passive': 'true' }
        });
    });
});
