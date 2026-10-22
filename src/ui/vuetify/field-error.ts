/**
 * @module
 * One helper binds a form field's error state both ways: Vuetify's `error-messages` (the visible
 * message) and `aria-invalid` (what a screen reader announces, and what the form toolkit's
 * `revealErrors()` looks for when it focuses the first bad field). Spread it with `v-bind`.
 */

/**
 * The props one field gets for its current errors.
 *
 * @param errors - The field's messages (one string or a list); empty or absent means valid.
 * @returns `error-messages`, plus `aria-invalid="true"` only while there is a message.
 */
export const fieldErrorProps = (
    errors: string | readonly string[] | undefined
): { 'error-messages': string | readonly string[]; 'aria-invalid': 'true' | undefined } => ({
    'error-messages': errors ?? [],
    'aria-invalid': errors && errors.length > 0 ? 'true' : undefined
});
