/**
 * @module
 * Touch sizing, in one place: row-action buttons default to Vuetify's `small` size for
 * density on desktop, but `small` is 28px, under the 44px a finger needs — so this swaps to
 * Vuetify's `large` (44px) where a tap replaces a mouse click.
 *
 * Two inputs, because neither is enough alone: width (`mobile`, below `sm`) catches a phone, the
 * pointer (`coarse`) catches a touch tablet or a touch laptop above that width.
 */
import { computed, type ComputedRef } from 'vue';
import { useDisplay } from 'vuetify';
import { useMediaQuery } from '@/ui/composables/use-media-query.ts';

/**
 * The smallest comfortable tap target, in px (WCAG 2.5.5 and the layout check's comfort tier).
 */
export const TOUCH_TARGET_PX = 44;

/**
 * Whether a finger, not a mouse, is the input: a phone-width viewport, or a coarse primary pointer.
 *
 * @returns A computed flag, reactive to the viewport and the pointer.
 */
export const useIsTouch = (): ComputedRef<boolean> => {
    const { mobile } = useDisplay();
    // `(pointer: coarse)`: the primary input is imprecise, a finger rather than a mouse.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer
    const coarse = useMediaQuery('(pointer: coarse)');
    return computed(() => mobile.value || coarse.value);
};

/**
 * Vuetify component `size`, reactive to the viewport and the pointer: `'large'` (44px) below
 * `sm` or when the primary pointer is a finger, `'small'` otherwise.
 *
 * @returns A computed size to bind to `:size` on a row-action `v-btn`.
 */
export const useTouchFriendlySize = (): ComputedRef<'small' | 'large'> => {
    const isTouch = useIsTouch();
    return computed(() => (isTouch.value ? 'large' : 'small'));
};

/**
 * The minimum width and height a button needs for a finger, for components whose size prop would
 * change the look (a wider `large`): bind it to `:min-height` and `:min-width`.
 *
 * @returns A computed {@link TOUCH_TARGET_PX} on touch, `undefined` otherwise (Vuetify's own size).
 */
export const useTouchTarget = (): ComputedRef<number | undefined> => {
    const isTouch = useIsTouch();
    return computed(() => (isTouch.value ? TOUCH_TARGET_PX : undefined));
};

/**
 * A chip's `size`: Vuetify's `x-large` (44px) under a finger, `small` otherwise. A chip has no
 * `min-height` prop, so the size prop is its only route to a tap target.
 *
 * @returns A computed size to bind to `:size` on a clickable `v-chip`.
 */
export const useTouchChipSize = (): ComputedRef<'small' | 'x-large'> => {
    const isTouch = useIsTouch();
    return computed(() => (isTouch.value ? 'x-large' : 'small'));
};
