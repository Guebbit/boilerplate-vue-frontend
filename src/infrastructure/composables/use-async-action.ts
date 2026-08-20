import { ref, shallowRef, type Ref } from 'vue';
import { getErrorMessage } from '@/infrastructure/utils/errors.ts';

/**
 * Settings for {@link useAsyncAction}.
 */
export interface UseAsyncActionSettings<T> {
    // Value of `data` before the first successful run, and after `reset()`
    initialData?: T;
    /**
     * Message stored in `error` when the rejection carries nothing readable at all. Already
     * translated by the caller — this composable does no i18n of its own. Omit it and the generic
     * translated "something went wrong" is used.
     */
    fallbackErrorMessage?: string;
}

/**
 * Loading/data/error state for one async call, and the wrapper that drives it.
 *
 * Deliberately NOT in `@guebbit/vue-toolkit`: the toolkit's composables are about *records* —
 * identified, cached, mutated — and this is the opposite case, a one-shot call whose answer is
 * just a payload. `fetchAny` covers the loading half but exposes neither `data` nor `error`, which
 * is what left `useAdminObservability` writing the same block once per endpoint.
 *
 * Never rejects. A failure lands in `error` and the promise still resolves, so one dead endpoint
 * on a dashboard leaves the other panels rendered instead of blanking the page.
 *
 * @param action   - Performs the call.
 * @param settings - See {@link UseAsyncActionSettings}.
 * @returns `data`, `error`, `loading`, plus `run` and `reset`.
 */
export const useAsyncAction = <T, TArguments extends unknown[] = []>(
    action: (...parameters: TArguments) => Promise<T>,
    { initialData, fallbackErrorMessage }: UseAsyncActionSettings<T> = {}
) => {
    const data = shallowRef<T | undefined>(initialData) as Ref<T | undefined>;
    const error = ref<string>();
    const loading = ref(false);

    /**
     * Sequence number of the most recent `run`.
     *
     * Guards against out-of-order responses: click Refresh twice and a slow first request can
     * resolve after a fast second one, overwriting fresh data with stale. Only the newest run is
     * allowed to write.
     */
    let latest = 0;

    /**
     * Runs the action, recording its outcome.
     *
     * @param parameters - Forwarded to `action`.
     * @returns A promise resolving with the payload, or `undefined` when the call failed.
     */
    const run = (...parameters: TArguments): Promise<T | undefined> => {
        const current = ++latest;
        loading.value = true;
        error.value = undefined;

        return action(...parameters)
            .then((result): T | undefined => {
                if (current !== latest) return undefined;
                data.value = result;
                return result;
            })
            .catch((error_: unknown): undefined => {
                if (current !== latest) return undefined;
                error.value = getErrorMessage(error_, fallbackErrorMessage);
                return undefined;
            })
            .finally(() => {
                // Only the newest run owns the flag, or an overtaken call would clear it while
                // its successor is still in flight.
                if (current === latest) loading.value = false;
            });
    };

    /**
     * Returns to the pre-run state.
     */
    const reset = () => {
        // Bumped so a run still in flight can no longer write to the state it just cleared
        latest++;
        data.value = initialData;
        error.value = undefined;
        loading.value = false;
    };

    return { data, error, loading, run, reset };
};
