/**
 * @module
 * Copy a text to the clipboard and say whether it worked, on a toast, either way.
 *
 * A one-time secret, a bank reference and a long request id share the same failure: a visitor who
 * thinks they copied and did not has no way back. So the failure is as loud as the success.
 */
import { useI18n } from 'vue-i18n';
import { copyToClipboard } from '@guebbit/js-toolkit';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';

/**
 * Builds the copy action of one component.
 *
 * `@guebbit/js-toolkit`'s `copyToClipboard` tries the async Clipboard API first (which the browser
 * can still refuse: a denied permission, a non-secure embed) and falls back to a hidden textarea
 * plus `execCommand('copy')` when that API is missing. It never rejects, it resolves `false`.
 * https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
 *
 * Call it in a component's setup: it reads the i18n and notification contexts.
 *
 * @param failureKey - the locale key of the toast shown when the copy fails, worded for what was copied
 * @returns A function that copies one text and toasts the outcome.
 */
export const useCopyToClipboard = (failureKey: string): ((text: string) => Promise<void>) => {
    const { t } = useI18n();
    const { addMessage } = useNotificationsStore();

    return (text) =>
        copyToClipboard(text).then((succeeded) => {
            if (succeeded) addMessage(t('generic.secret-reveal-copied'));
            else addMessage(t(failureKey), EToastType.DANGER);
        });
};
