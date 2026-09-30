/**
 * @module
 * Every dialog in the app goes fullscreen on a phone instead of floating at a fixed `max-width`,
 * which would cramp its fields (or letterbox a confirmation) on a narrow screen. One flag, one
 * place: a dialog binds `:fullscreen="fullscreen"` and never reads the breakpoint itself.
 */
import type { Ref } from 'vue';
import { useDisplay } from 'vuetify';

/**
 * Whether a dialog should fill the screen: Vuetify's `mobile` flag, true below the `sm`
 * breakpoint and reactive to the viewport.
 *
 * @returns A ref to bind to `v-dialog`'s `:fullscreen`.
 */
export const useFullscreenDialog = (): Ref<boolean> => useDisplay().mobile;
