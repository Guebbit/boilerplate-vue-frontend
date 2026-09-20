/**
 * @module
 * The inline half of error handling for a workflow that cannot proceed — a save, delete, refund
 * or lookup that failed, or a lookup that came back empty. Pairs with `InlineErrorAlert`
 * (`src/ui/molecules/`) the same way `notifyErrorMessages` (this directory's `errors.ts`) pairs
 * with a toast: every real failure still reaches Faro, but the message stays local to the form or
 * panel it blocked instead of joining the toast queue. Lives here rather than in `ui/composables`
 * because it reaches into observability, and `ui` may not — see `eslint.config.ts`'s tier
 * boundary rules. See docs/theory/request-flow.md for which pairing a call site should use.
 */
import { ref, type Ref } from 'vue';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { getErrorMessage } from '@/infrastructure/utils/errors.ts';

/**
 * Everything {@link useBlockingError} returns.
 */
export interface UseBlockingErrorReturn {
    /**
     * The current message, or `undefined` before a failure or after {@link clear}. Callers set
     * it back to `undefined` on their own next success — this composable only ever writes it
     * through {@link report} or {@link warn}.
     */
    message: Ref<string | undefined>;
    /**
     * The current message's tone — `'error'` from {@link report}, `'warning'` from {@link warn}.
     * Read by `InlineErrorAlert` to colour the alert; meaningless while {@link message} is unset.
     */
    type: Ref<'error' | 'warning'>;
    /**
     * Records a caught error as this workflow's own blocking message, and reports it to Faro —
     * the same observability half `notifyErrorMessages` performs for a toasted one.
     *
     * @param error - The original thrown value, forwarded untouched to Faro.
     */
    report: (error: unknown) => void;
    /**
     * Records an expected absence — a lookup that matched nothing, not a failure — as this
     * workflow's own blocking message. Unlike {@link report}, nothing reaches Faro: there is
     * nothing here an error monitor should ever see.
     *
     * @param text - Already-translated copy to show.
     */
    warn: (text: string) => void;
    /**
     * Clears a stale message, typically right before the workflow's next attempt.
     */
    clear: () => void;
}

/**
 * One blocked workflow's own error state — a save, delete, refund or lookup a view renders
 * through `InlineErrorAlert` instead of a toast, because the failure needs to stay next to
 * whatever it stopped rather than fade with the toast queue.
 *
 * @returns See {@link UseBlockingErrorReturn}.
 */
export const useBlockingError = (): UseBlockingErrorReturn => {
    /**
     * The message this workflow is currently blocked on.
     */
    const message = ref<string>();

    /**
     * The current message's tone.
     */
    const type = ref<'error' | 'warning'>('error');

    return {
        message,
        type,
        report: (error: unknown) => {
            type.value = 'error';
            message.value = getErrorMessage(error);
            useObservabilityStore().captureException(error);
        },
        warn: (text: string) => {
            type.value = 'warning';
            message.value = text;
        },
        clear: () => {
            message.value = undefined;
        }
    };
};
