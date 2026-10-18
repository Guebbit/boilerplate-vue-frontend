/**
 * @module
 * `useTouchFriendlySize` — row-action buttons stay compact with a mouse on a wide screen and
 * grow to a finger's 44 px below `sm` or whenever the primary pointer is coarse.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { asStub } from '../../support/stub.ts';

/** Vuetify's `mobile` flag, which the test flips. */
const mobile = ref(false);

vi.mock('vuetify', () => ({ useDisplay: () => ({ mobile }) }));

/**
 * Stubs `matchMedia` so `(pointer: coarse)` answers `coarse` and nothing else matches.
 *
 * @param coarse - whether the primary pointer is a finger
 */
const stubPointer = (coarse: boolean): void => {
    vi.stubGlobal('matchMedia', (query: string) =>
        asStub<MediaQueryList>({
            matches: query === '(pointer: coarse)' && coarse,
            addEventListener: () => undefined,
            removeEventListener: () => undefined
        })
    );
};

describe('useTouchFriendlySize', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it.each([
        { width: 'wide', mobile: false, coarse: false, size: 'small' },
        { width: 'narrow', mobile: true, coarse: false, size: 'large' },
        { width: 'wide', mobile: false, coarse: true, size: 'large' },
        { width: 'narrow', mobile: true, coarse: true, size: 'large' }
    ])('is $size on a $width screen with coarse=$coarse', (row) => {
        mobile.value = row.mobile;
        stubPointer(row.coarse);

        expect(effectScope().run(() => useTouchFriendlySize().value)).toBe(row.size);
    });

    it('follows the viewport once created', () => {
        mobile.value = false;
        stubPointer(false);
        const size = effectScope().run(() => useTouchFriendlySize());

        mobile.value = true;

        expect(size?.value).toBe('large');
    });
});
