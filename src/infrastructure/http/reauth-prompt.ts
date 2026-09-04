/**
 * @module
 * Pinia store for the step-up prompt's open/closed state: the queued-promise shape `ui/dialog.ts`
 * uses, but resolving `void` rather than `boolean` — a step-up answers "a fresh session now
 * exists", not a yes/no. Lives in `infrastructure/` rather than `ui/` because `step-up.ts` reads
 * it directly and the infrastructure tier may not import `ui` — see `eslint.config.ts`'s tier
 * rules. `app/components/ReauthDialog.vue` is the only renderer; the actual
 * `POST /account/reauth` call and token adoption happen there, through `useAuthStore().reauth()`.
 */

import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

/**
 * One pending step-up request: settles once the dialog resolves it.
 */
interface PendingStepUp {
    /**
     * Settles the caller's promise once a fresh session exists.
     */
    resolve: () => void;
    /**
     * Settles the caller's promise with the reason the prompt did NOT end in a fresh session —
     * the visitor closed it, or the tab navigated away.
     */
    reject: (reason: unknown) => void;
}

/**
 * The one step-up prompt the app ever shows at a time.
 *
 * `infrastructure/http/step-up.ts` is single-flight already — it never calls
 * {@link requestStepUp} a second time while one is outstanding — so this store only ever holds
 * ONE pending entry, unlike `ui/dialog.ts`'s queue of independent confirmations.
 */
export const useReauthPromptStore = defineStore('reauthPrompt', () => {
    /**
     * The live prompt, or `undefined` when nothing is asking.
     */
    const pending = ref<PendingStepUp>();

    /**
     * Whether `ReauthDialog.vue` should be showing.
     */
    const isOpen = computed(() => Boolean(pending.value));

    /**
     * Opens the prompt. Called by the step-up interceptor, never directly by a component.
     *
     * @returns A promise resolving once {@link resolveStepUp} is called, rejected by
     *  {@link rejectStepUp}.
     */
    const requestStepUp = (): Promise<void> =>
        new Promise((resolve, reject) => {
            pending.value = { resolve, reject };
        });

    /**
     * Answers the live prompt with success — a fresh session now exists.
     */
    const resolveStepUp = () => {
        pending.value?.resolve();
        pending.value = undefined;
    };

    /**
     * Answers the live prompt with failure — the visitor closed it without re-proving their
     * password.
     *
     * @param reason - Forwarded to the interceptor's rejection; never shown to the visitor
     *  directly.
     */
    const rejectStepUp = (reason: unknown) => {
        pending.value?.reject(reason);
        pending.value = undefined;
    };

    return { isOpen, requestStepUp, resolveStepUp, rejectStepUp };
});
