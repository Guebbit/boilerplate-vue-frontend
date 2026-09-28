/**
 * @module
 * CSS selectors describing Vuetify's own generated markup — `infrastructure` may not know what a
 * `v-input` is, so a selector naming one lives here instead, next to `index.ts`'s theme/`defaults`
 * config, the other place this app's Vuetify-specific knowledge is kept.
 */

/**
 * Where `useStructureFormValidation`'s `revealErrors()` looks for the field to focus after a
 * failed submit.
 *
 * The toolkit defaults to `[aria-invalid="true"]`, which is the right general answer and the
 * wrong one here: `v-input` wraps the native control, and only the *wrapper* carries Vuetify's
 * error class — focus has to land on something focusable inside it. The trailing `[tabindex]`
 * catches non-native inputs (`v-select`) that expose no input/textarea/select of their own.
 *
 * One constant rather than eleven copies: every form passes it as `invalidFieldSelector`.
 */
export const VUETIFY_INVALID_FIELD_SELECTOR =
    '.v-input--error input, .v-input--error textarea, .v-input--error select, .v-input--error [tabindex]';
