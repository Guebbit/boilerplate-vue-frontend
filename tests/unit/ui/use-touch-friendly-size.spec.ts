/**
 * @module
 * `useTouchFriendlySize` — row-action buttons stay compact with a mouse and grow to a finger's
 * 44 px below the `sm` breakpoint.
 */
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';

/** Vuetify's `mobile` flag, which the test flips. */
const mobile = ref(false);

vi.mock('vuetify', () => ({ useDisplay: () => ({ mobile }) }));

describe('useTouchFriendlySize', () => {
    it('is small from the sm breakpoint up', () => {
        mobile.value = false;

        expect(useTouchFriendlySize().value).toBe('small');
    });

    it("is Vuetify's large (44 px) below it, and follows the viewport", () => {
        mobile.value = false;
        const size = useTouchFriendlySize();

        mobile.value = true;

        expect(size.value).toBe('large');
    });
});
