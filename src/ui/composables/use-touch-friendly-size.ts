/**
 * @module
 * One composable, one line of logic: row-action buttons default to Vuetify's `small` size for
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
 * Vuetify component `size`, reactive to the viewport and the pointer: `'large'` (44px) below
 * `sm` or when the primary pointer is a finger, `'small'` otherwise.
 *
 * @returns A computed size to bind to `:size` on a row-action `v-btn`.
 */
export const useTouchFriendlySize = (): ComputedRef<'small' | 'large'> => {
    const { mobile } = useDisplay();
    // `(pointer: coarse)`: the primary input is imprecise, a finger rather than a mouse.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/@media/pointer
    const coarse = useMediaQuery('(pointer: coarse)');
    return computed(() => (mobile.value || coarse.value ? 'large' : 'small'));
};
