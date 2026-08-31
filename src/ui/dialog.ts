/**
 * @module
 * Pinia store implementing `globalThis.confirm()` as an async, themeable, queued promise: callers
 * push a request and await the resolution; `DialogHost` renders the queue's head and answers it.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';

/**
 * What a confirmation asks, and how it is dressed.
 *
 * Copy only — every string arrives already translated, because this store is design-system code
 * and owns no dictionary. The caller has `t()`; the store has a promise.
 */
export interface DialogRequest {
    /**
     * Optional heading. Omitted, the message stands alone.
     */
    title?: string;
    /**
     * The question. Required: a confirmation with nothing to confirm is a bug.
     */
    message: string;
    /**
     * Label of the button that resolves `true`. The host falls back to its generic label.
     */
    confirmLabel?: string;
    /**
     * Label of the button that resolves `false`. The host falls back to its generic label.
     */
    cancelLabel?: string;
    /**
     * Colour of the confirming button — `error` for a destructive action, the default otherwise.
     */
    color?: 'primary' | 'error' | 'warning';
}

/**
 * One pending question: what was asked, plus how to answer it.
 */
export interface DialogEntry extends DialogRequest {
    /**
     * Monotonically increasing id, oldest-first ordering key.
     */
    id: number;
    /**
     * Settles the caller's promise with the viewer's answer.
     */
    resolve: (answer: boolean) => void;
}

/**
 * The app's one modal confirmation, as a promise.
 *
 * `globalThis.confirm()` is synchronous, un-themed, unreachable by the design tokens and the
 * translation tier, and it blocks the event loop — a half-typed cell loses its focus behind it.
 * This is the same contract made asynchronous: `confirm(request)` resolves `true` when the viewer
 * accepts and `false` when they decline, close the dialog, or press Escape — so a caller writes
 * `.then((accepted) => { if (!accepted) return; ... })` and nothing else changes.
 *
 * Questions QUEUE rather than replace: two components asking at once — a row delete racing a
 * navigation guard — each get their answer in order, and neither resolves on the other's click.
 *
 * The rendering lives in `ui/organisms/DialogHost.vue`, mounted once by the layout. This
 * store neither imports Vuetify nor knows what a dialog looks like; it holds the queue and the
 * promises, which is what makes it testable in jsdom without a component tree.
 */
export const useDialogStore = defineStore('dialog', () => {
    /**
     * Pending questions, oldest first. The host renders the first one.
     */
    const queue = ref<DialogEntry[]>([]);

    /**
     * Source of {@link DialogEntry.id}; increments once per {@link confirm} call.
     */
    let nextId = 1;

    /**
     * Asks the viewer. Resolves with their answer once they give one.
     *
     * @param request - What to ask, already translated.
     * @returns A promise resolving `true` on accept, `false` on decline or dismiss. Never rejects.
     */
    const confirm = (request: DialogRequest): Promise<boolean> =>
        new Promise<boolean>((resolve) => {
            queue.value.push({ ...request, id: nextId++, resolve });
        });

    /**
     * Answers the question at the front of the queue. Called by the host, once per click.
     *
     * @param answer - `true` for the confirming button, `false` for anything else.
     */
    const answer = (answer: boolean) => {
        const entry = queue.value.shift();
        entry?.resolve(answer);
    };

    return { queue, confirm, answer };
});
