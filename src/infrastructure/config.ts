/**
 * @module
 * What the backend publishes before anyone has signed in, read once from `GET /config` and held in
 * a module-level ref: how sessions are kept (`session`), which OAuth providers exist
 * (`oauthProviders`) and which human challenge a form asks for (`antibot`).
 *
 * One call instead of three, shared by every reader: the session store (`loadSessionMode`), the
 * OAuth buttons, the human check and the cookie table all go through {@link loadConfig}, so the
 * request is made once per tab however many of them ask. `GET /shop` stays its own call (the shop
 * is removable); the app starts both in parallel.
 */
import { readonly, ref } from 'vue';
import { getConfig } from '@api';
import type { Config } from '@api';
import { logger } from '@/infrastructure/utils/logger.ts';

/** The loaded answer, or `undefined` while unknown. */
const config = ref<Config>();

/** The in-flight or settled load, so concurrent and repeated callers share one request. */
let loading: Promise<Config | undefined> | undefined;

/** Read-only view of the answer; `undefined` until {@link loadConfig} has resolved. */
export const publicConfig = readonly(config);

/**
 * Loads the public config once. A failure is logged and leaves it empty, and the next call tries
 * again: the endpoint is public, so a failure here is the network's, not a refusal.
 *
 * @returns A promise resolving with the answer, or `undefined` when it could not be read. Never
 *  rejects.
 */
export const loadConfig = (): Promise<Config | undefined> => {
    loading ??= getConfig()
        .then((response) => {
            config.value = response;
            return response;
        })
        .catch((error: unknown) => {
            logger.error('[Config] Could not read the public config:', error);
            loading = undefined;
            return undefined;
        });
    return loading;
};

/**
 * Forgets the loaded value so the next {@link loadConfig} asks again — for tests, which share this
 * module's state across cases.
 */
export const resetConfig = (): void => {
    config.value = undefined;
    loading = undefined;
};
