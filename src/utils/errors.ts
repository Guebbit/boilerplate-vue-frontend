import { useObservabilityStore } from '@/stores/observability';

/**
 * Extracts a human-readable message from any thrown/rejected value.
 *
 * @param error - Unknown value caught in a `catch` block or promise rejection:
 *  a string, an `Error`, or any object exposing a non-empty `message`.
 * @returns The best message found, or `'Unknown error'` when nothing usable is
 *  available.
 */
const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string' && error) return error;
    if (error instanceof Error && error.message) return error.message;
    // Covers non-Error rejects with a message field, e.g. parsed API error bodies
    // or values thrown across a serialization boundary (workers, JSON RPC).
    if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message
    )
        return error.message;
    return 'Unknown error';
};

/**
 * Shows a best-effort message to the user and always reports the real
 * error to the observability logger (Faro), stack included when available.
 *
 * @param addMessage - Sink for the user-facing message, typically a feedback
 *  store action or a toast helper. Its return value is ignored.
 * @param error - The original thrown value, forwarded untouched to Faro.
 */
export const notifyErrorMessages = (
    addMessage: (message: string) => unknown,
    error: unknown
): void => {
    addMessage(getErrorMessage(error));
    useObservabilityStore().captureException(error);
};

/**
 * Moves focus to the first invalid field of a form, for accessibility after a
 * failed submit.
 *
 * Targets Vuetify's error state class rather than `:invalid`/`aria-invalid`,
 * since `v-input` wraps the native control and only the wrapper carries that
 * class. The trailing `[tabindex]` catches non-native inputs (e.g. `v-select`)
 * that expose no focusable input/textarea/select of their own.
 *
 * @param formElement - The form to search; nullish is a no-op so callers can
 *  pass an unmounted template ref directly.
 * @param firstFormErrorFieldSelector - Override for the CSS selector used to
 *  locate the field, for non-Vuetify markup.
 * @returns Nothing; focus is applied as a side effect when a field is found.
 */
export const focusFirstErrorField = (
    formElement?: HTMLFormElement,
    firstFormErrorFieldSelector = '.v-input--error input, .v-input--error textarea, .v-input--error select, .v-input--error [tabindex]'
) => formElement?.querySelector<HTMLElement>(firstFormErrorFieldSelector)?.focus();
