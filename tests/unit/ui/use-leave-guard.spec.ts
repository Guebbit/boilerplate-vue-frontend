/**
 * @module
 * `useLeaveGuard` — a dirty staff form asks before a navigation throws it away, and stays silent
 * when nothing would be lost: clean, just saved, or the session already over.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useLeaveGuard } from '@/ui/composables/use-leave-guard.ts';
import { useDialogStore } from '@/ui/dialog.ts';

/** The leave guard the composable registered, captured from the mocked router hook. */
const registered = vi.hoisted(() => ({ guard: undefined as undefined | (() => unknown) }));

vi.mock('vue-router', () => ({
    onBeforeRouteLeave: (guard: () => unknown) => {
        registered.guard = guard;
    }
}));

describe('useLeaveGuard', () => {
    /** Whether the form reads dirty; the tests flip it. */
    const dirty = ref(false);

    /** Whether the viewer is still signed in. */
    let signedIn: boolean;

    /** The answer the dialog gives when asked. */
    let answer: boolean;

    /** Spy standing in for `useDialogStore().confirm`. */
    let confirm: ReturnType<typeof vi.fn<() => Promise<boolean>>>;

    /** The composable's return value for the current test. */
    let guard: ReturnType<typeof useLeaveGuard>;

    /** The scope the composable runs in; stopped after each test so no listener outlives it. */
    let scope: ReturnType<typeof effectScope>;

    beforeEach(() => {
        setActivePinia(createPinia());
        dirty.value = false;
        answer = true;
        signedIn = true;
        confirm = vi.fn<() => Promise<boolean>>(() => Promise.resolve(answer));
        useDialogStore().confirm = confirm;
        scope = effectScope();
        guard = scope.run(() => useLeaveGuard(dirty, () => signedIn)) ?? {
            markSaved: () => undefined
        };
    });

    afterEach(() => {
        scope.stop();
    });

    it('lets a clean form leave without asking', () => {
        expect(registered.guard?.()).toBe(true);
        expect(confirm).not.toHaveBeenCalled();
    });

    it('asks when the form is dirty, and cancels the leave when the viewer stays', async () => {
        dirty.value = true;
        answer = false;

        await expect(registered.guard?.()).resolves.toBe(false);
        expect(confirm).toHaveBeenCalledTimes(1);
    });

    it('lets a dirty form leave when the viewer accepts', async () => {
        dirty.value = true;

        await expect(registered.guard?.()).resolves.toBe(true);
    });

    it('stays silent after a save, even while the form still reads dirty', () => {
        dirty.value = true;
        guard.markSaved();

        expect(registered.guard?.()).toBe(true);
        expect(confirm).not.toHaveBeenCalled();
    });

    it('asks again once a saved form is clean and then typed in again', async () => {
        dirty.value = true;
        await nextTick();
        guard.markSaved();
        dirty.value = false;
        await nextTick();
        dirty.value = true;

        await registered.guard?.();
        expect(confirm).toHaveBeenCalledTimes(1);
    });

    it('stays silent when the session is already over', () => {
        dirty.value = true;
        signedIn = false;

        expect(registered.guard?.()).toBe(true);
        expect(confirm).not.toHaveBeenCalled();
    });

    it('asks the browser to confirm closing the tab only while the form holds work', async () => {
        const event = new Event('beforeunload', { cancelable: true });
        globalThis.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);

        dirty.value = true;
        await nextTick();
        const dirtyEvent = new Event('beforeunload', { cancelable: true });
        globalThis.dispatchEvent(dirtyEvent);
        expect(dirtyEvent.defaultPrevented).toBe(true);

        guard.markSaved();
        await nextTick();
        const savedEvent = new Event('beforeunload', { cancelable: true });
        globalThis.dispatchEvent(savedEvent);
        expect(savedEvent.defaultPrevented).toBe(false);
    });
});
