/**
 * @module
 * `useFocusTooltip` — a nav tooltip opens on keyboard focus only, and closes one task AFTER the
 * blur, never inside it: a close inside the blur makes Vuetify hand focus back to the button, and
 * Tab could not leave the top bar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFocusTooltip } from '@/app/components/use-focus-tooltip.ts';
import { asStub } from '../../support/stub.ts';

/** A `focus` event whose target reports the given `:focus-visible` state. */
const focusEvent = (focusVisible: boolean) =>
    asStub<FocusEvent>({
        target: { matches: (selector: string) => selector === ':focus-visible' && focusVisible }
    });

describe('useFocusTooltip', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('opens on a keyboard focus and stays shut on a pointer focus', () => {
        const { tooltipOpen, openTooltipOnRealFocus } = useFocusTooltip();

        openTooltipOnRealFocus(focusEvent(false));
        expect(tooltipOpen.value).toBe(false);

        openTooltipOnRealFocus(focusEvent(true));
        expect(tooltipOpen.value).toBe(true);
    });

    it('closes after the blur has finished, not during it', () => {
        const { tooltipOpen, openTooltipOnRealFocus, closeTooltip } = useFocusTooltip();
        openTooltipOnRealFocus(focusEvent(true));

        closeTooltip();
        expect(tooltipOpen.value).toBe(true);

        vi.runAllTimers();
        expect(tooltipOpen.value).toBe(false);
    });
});
