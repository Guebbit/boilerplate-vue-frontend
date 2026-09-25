/**
 * @module
 * Debounced wiring for `POST /account/password/check` — advisory only, never a submit gate; the
 * four password-SET paths remain the actual authority, checked again server-side regardless of
 * what this endpoint answered. Shared by `Signup.vue`, `ProfilePasswordChange.vue` and
 * `PasswordResetConfirm.vue`, the three forms that ask for a brand-new password.
 */
import { ref } from 'vue';
import { debounce } from 'lodash-es';
import { checkPasswordBreached } from '@api';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import type { PasswordCheck } from '@types';

/**
 * Checks a candidate password against the breach list as the visitor types, without hammering the
 * endpoint on every keystroke.
 *
 * @param delayMs - How long typing must pause before a check fires. The endpoint's own budget is
 *  roughly 20 requests per window per caller (`docs/api/regenerating.md`'s contract notes) — a
 *  half-second pause comfortably stays under it for anyone typing at a human pace.
 * @returns `breached`, `checking`, and `check(password)` to call on every input event.
 */
export const usePasswordBreachCheck = (delayMs = 500) => {
    /**
     * Whether the last CHECKED password matched a known-breached one. Advisory display only.
     */
    const breached = ref(false);

    /**
     * Whether a check is currently in flight — lets a caller show a quiet spinner instead of
     * nothing while the debounced request is outstanding.
     */
    const checking = ref(false);

    /**
     * Guards against an out-of-order answer: a slower earlier request landing after a faster
     * later one would otherwise flash a stale verdict for the password now on screen.
     */
    let requestId = 0;

    /**
     * The debounced sender. Trailing-edge only (lodash's default), so a burst of keystrokes
     * collapses into the one check for whatever the visitor stopped typing.
     */
    const send = debounce((password: string) => {
        const thisRequest = ++requestId;
        checking.value = true;
        checkPasswordBreached({ password })
            .then((data) => {
                if (thisRequest !== requestId) return;
                breached.value = getPayloadFromResponse<PasswordCheck>(data)?.breached ?? false;
            })
            .catch(() => {
                // Advisory only: a failed check must never alarm or block, so it reads as clean.
                if (thisRequest === requestId) breached.value = false;
            })
            .finally(() => {
                if (thisRequest === requestId) checking.value = false;
            });
    }, delayMs);

    /**
     * Queues a check for the password currently on screen; cancels a pending one and resets to
     * clean for an empty field, since there is nothing to warn about yet.
     *
     * @param password - The candidate value, read off the form on every keystroke.
     */
    const check = (password: string) => {
        if (!password) {
            send.cancel();
            breached.value = false;
            checking.value = false;
            return;
        }
        send(password);
    };

    return { breached, checking, check };
};
