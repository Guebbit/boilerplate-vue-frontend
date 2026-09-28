/**
 * @module
 * The Vue app's last resort for an error a component's own render/setup/watcher throws with
 * nothing downstream to catch it — `app.config.errorHandler`, wired in `main.ts`. Reports to Faro
 * and tells the visitor something broke, rather than leaving a blank page with nothing to show for
 * it but a stack trace only a developer will ever see (FA74).
 */
import type { ComponentPublicInstance } from 'vue';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { translate } from '@/infrastructure/i18n';
import { GENERIC_ERROR_KEY } from '@/app/utils/error-messages.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * Vue's own `app.config.errorHandler` signature, implemented here so `main.ts` wires it in one
 * line and this file stays the one place its behaviour is described and tested.
 *
 * @param error - whatever was thrown; Vue types this `unknown` since a component can throw
 *  anything, not only an `Error`.
 * @param instance - the component instance the error came from — unused here, since Faro gets
 *  the error itself rather than which component rendered it.
 * @param info - Vue's own description of the lifecycle hook the error came from (e.g. "render
 *  function"), folded into the log line for whoever reads it.
 */
export const handleUncaughtVueError = (
    error: unknown,
    instance: ComponentPublicInstance | null,
    info: string
): void => {
    logger.error('[Vue]', info, error);

    // Neither store may be initialised yet — an error thrown during the app's own bootstrap,
    // before `setActivePinia` runs. Reporting the ORIGINAL error must not itself throw a second
    // one that replaces it.
    // eslint-disable-next-line no-restricted-syntax -- an observability/notification failure must never mask the error it is trying to report
    try {
        useObservabilityStore().captureException(
            error instanceof Error ? error : new Error(String(error))
        );
        useNotificationsStore().addMessage(translate(GENERIC_ERROR_KEY));
    } catch {
        // Neither store is ready yet — nothing left to notify.
    }
};
