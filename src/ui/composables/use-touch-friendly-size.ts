/**
 * @module
 * One composable, one line of logic: row-action buttons default to Vuetify's `small` size for
 * density on desktop, but `small` is 28px, under the 44px a finger needs — so this swaps to
 * Vuetify's `large` (44px) below the `sm` breakpoint, where a tap replaces a mouse click.
 */
import { computed, type ComputedRef } from 'vue';
import { useDisplay } from 'vuetify';

/**
 * Vuetify component `size`, reactive to the viewport: `'small'` from `sm` up, `'large'` (44px)
 * below it.
 *
 * @returns A computed size to bind to `:size` on a row-action `v-btn`.
 */
export const useTouchFriendlySize = (): ComputedRef<'small' | 'large'> => {
    const { mobile } = useDisplay();
    return computed(() => (mobile.value ? 'large' : 'small'));
};
