/**
 * @module
 * Everything a form fronting the backend's `humanChallengeGate` needs, and the two calls
 * `HumanCheck.vue` itself makes — no domain module owns rung 3, so this is where they live rather
 * than in a component (`no-restricted-imports` bars `.vue` files from calling `@api` directly).
 * `withAntibotToken` attaches a solved token to a request's headers, and
 * `isAntibotVerificationFailed` detects the 401 that means "show the widget and let the visitor
 * retry the same submit." See the paired backend's
 * `src/infrastructure/http/middlewares/human-challenge.ts`.
 */
import type { AxiosRequestConfig } from 'axios';
import { getAntibotConfig, getAntibotChallenge } from '@api';
import { getFirstApiError } from './envelope.ts';
import { ERROR_CODES } from '@api/error-codes';

/** The header `humanChallengeGate` reads off every gated request. */
const ANTIBOT_TOKEN_HEADER = 'x-antibot-challenge-token';

/**
 * Merges a solved `HumanCheck` token into a request's headers, alongside whatever the caller
 * already set (e.g. `onUploadProgress`).
 *
 * @param token - `HumanCheck`'s exposed token, or `undefined` when the active provider is `none`
 *  or the visitor has not solved it yet — either way there is nothing to attach.
 * @param options - Per-call axios overrides to merge into, forwarded from the caller.
 * @returns `options` unchanged when there is no token; otherwise a shallow copy carrying the
 *  header next to whatever `options` already set.
 */
export const withAntibotToken = (
    token: string | undefined,
    options?: AxiosRequestConfig
): AxiosRequestConfig | undefined => {
    if (!token) return options;
    return {
        ...options,
        // eslint-disable-next-line @typescript-eslint/no-misused-spread -- AxiosHeaders' own enumerable entries are exactly what an object spread copies; orvalMutator merges headers the same way
        headers: { ...options?.headers, [ANTIBOT_TOKEN_HEADER]: token }
    };
};

/**
 * Whether a rejected API call was refused for a missing or invalid human-challenge token — the
 * signal to render `HumanCheck` inline and let the visitor retry the exact same submit.
 *
 * @param error - The rejected value a `.catch` caught.
 * @returns `true` when the first structured error is `ANTIBOT_VERIFICATION_FAILED`.
 */
export const isAntibotVerificationFailed = (error: unknown): boolean =>
    getFirstApiError(error)?.code === ERROR_CODES.ANTIBOT_VERIFICATION_FAILED;

/**
 * Which provider is active, and what `HumanCheck.vue` needs to render its widget. Re-exported
 * rather than called straight from the component — see the module doc.
 */
export const fetchAntibotConfig = () => getAntibotConfig();

/**
 * A fresh ALTCHA challenge for the widget to solve. Only meaningful once `fetchAntibotConfig`
 * reports the `altcha` provider — every other provider 404s here.
 */
export const fetchAntibotChallenge = () => getAntibotChallenge();
