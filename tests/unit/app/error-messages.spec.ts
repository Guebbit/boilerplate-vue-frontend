/**
 * `error-messages.ts` — the one predicate `Error.vue` and `router/index.ts`'s `onError`
 * both check, so a message this app's own dictionary does not own never reaches the page, the URL
 * or Umami's pageview verbatim.
 */
import { describe, expect, it } from 'vitest';
import { GENERIC_ERROR_KEY, isKnownErrorMessage } from '@/app/utils/error-messages';

describe('isKnownErrorMessage', () => {
    it.each([
        ['error-page.not-found', true],
        ['error-page.unexpected', true],
        ['navigation.error-forbidden', true],
        ['Failed to fetch dynamically imported module: https://example.com/assets/x.js', false],
        ['Network Error', false],
        ['', false]
    ])('%s -> %s', (message, expected) => {
        expect(isKnownErrorMessage(message)).toBe(expected);
    });

    it('is not itself a match for the generic key’s own namespace by accident', () => {
        // A sanity check on the fixture above: the generic key must pass, since Error.vue
        // translates it the same way as any other known key.
        expect(isKnownErrorMessage(GENERIC_ERROR_KEY)).toBe(true);
    });
});
