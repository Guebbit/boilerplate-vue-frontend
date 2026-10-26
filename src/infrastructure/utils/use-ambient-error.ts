/**
 * @module
 * What a background read does when it fails: an ambient toast, reported to Faro.
 * The "ambient" half of `docs/theory/request-flow.md#blocked-vs-ambient-failures`, as
 * `useMissingRecord` is the "record is not there" half.
 */
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * Builds the handler a fire-and-forget read ends in: `fetchX().catch(onAmbientError)`.
 * Call it in `setup`, where the notifications store can be resolved.
 *
 * @returns A handler taking the rejected value and toasting its messages.
 */
export const useAmbientError = (): ((error: unknown) => void) => {
    const { addMessage } = useNotificationsStore();

    return (error) => {
        notifyErrorMessages(addMessage, error);
    };
};
