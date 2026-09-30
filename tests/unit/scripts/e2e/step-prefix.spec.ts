/**
 * `scripts/e2e/step-prefix.ts` — the line that tells a journey's failure which step it was in.
 */
import { describe, expect, it } from 'vitest';
import { prefixWithStep } from '../../../../scripts/e2e/step-prefix';

describe('prefixWithStep', () => {
    it('puts the step on the first line, the original message below it', () => {
        expect(prefixWithStep('Expected to find element', 'pays with the declined card')).toBe(
            '[step: pays with the declined card]\nExpected to find element'
        );
    });

    it('leaves a message alone before any step has started', () => {
        expect(prefixWithStep('Expected to find element', undefined)).toBe(
            'Expected to find element'
        );
    });

    it('does not prefix twice when the event fires again for the same error', () => {
        const once = prefixWithStep('boom', 'a');

        expect(prefixWithStep(once, 'b')).toBe(once);
    });
});
