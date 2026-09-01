/**
 * @module
 * One composable, one line of logic: row-action buttons default to Vuetify's `small` size for
 * density on desktop, but `small` (~32px) sits under WCAG's 44px touch-target recommendation —
 * so this swaps to Vuetify's own default (bigger, unset) size below the `sm` breakpoint, where a
 * tap replaces a mouse click.
 */
import { computed, type ComputedRef } from 'vue';
import { useDisplay } from 'vuetify';

/**
 * Vuetify component `size`, reactive to the viewport: `'small'` above `sm`, `undefined`
 * (Vuetify's own default, larger) at or below it.
 *
 * @returns A computed size to bind to `:size` on a row-action `v-btn`.
 */
export const useTouchFriendlySize = (): ComputedRef<'small' | undefined> => {
    const { mobile } = useDisplay();
    return computed(() => (mobile.value ? undefined : 'small'));
};
