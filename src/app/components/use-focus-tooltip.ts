/**
 * @module
 * The open state of a nav button's tooltip, driven by keyboard focus instead of `v-tooltip`'s own
 * `open-on-focus` wiring. Shared by the icon button and the pinned button, which differ in what
 * they show and not in how their tooltip behaves.
 */
import { ref, type Ref } from 'vue';

/**
 * What {@link useFocusTooltip} hands back.
 */
export interface FocusTooltip {
    /**
     * Whether the tooltip shows. Bind it to the `v-tooltip`'s `v-model`.
     */
    tooltipOpen: Ref<boolean>;
    /**
     * `focus` listener: opens the tooltip on a real keyboard focus.
     */
    openTooltipOnRealFocus: (event: FocusEvent) => void;
    /**
     * `blur` listener: closes the tooltip once focus has settled on its next stop.
     */
    closeTooltip: () => void;
}

/**
 * Opens a tooltip on keyboard focus and closes it on blur.
 *
 * Opening mirrors the `:focus-visible` check Vuetify's own `open-on-focus` makes, but skips the
 * 50 ms "reopen lock" that wiring keeps after the last close: Tab away and Shift+Tab back inside
 * that window (routine under e2e CPU contention) would drop the reopen.
 * https://github.com/vuetifyjs/vuetify/blob/v4.1.5/packages/vuetify/src/components/VOverlay/useActivator.ts
 *
 * Closing is deferred one task, and that delay is the point. While a `blur` event is being
 * handled `document.activeElement` is the body, and Vuetify's overlay, on closing, hands focus
 * back to its activator whenever it finds the body focused and was opened from that activator. A
 * synchronous close therefore pulled focus straight back: Tab could not leave the button, which
 * is a keyboard trap. One task later focus is already on its next stop and the overlay leaves it
 * alone.
 *
 * @returns the open state and the two listeners that drive it
 */
export const useFocusTooltip = (): FocusTooltip => {
    /**
     * Whether the tooltip shows.
     */
    const tooltipOpen = ref(false);

    return {
        tooltipOpen,
        openTooltipOnRealFocus: (event) => {
            if ((event.target as HTMLElement).matches(':focus-visible')) tooltipOpen.value = true;
        },
        closeTooltip: () => {
            // `setTimeout` 0: after the blur/focus pair has finished moving focus (see above).
            setTimeout(() => {
                tooltipOpen.value = false;
            }, 0);
        }
    };
};
