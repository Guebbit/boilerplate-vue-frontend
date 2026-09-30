/**
 * @module
 * `useResetOnViewerChange` — a store's per-person state is reset when the person leaves or is
 * replaced, and only then: not at the first sign-in, not when the same person's record refreshes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useResetOnViewerChange } from '@/infrastructure/utils/use-reset-on-viewer-change.ts';

/** A viewer with the given id. */
const viewerOf = (id: string) => ({ id, email: `${id}@x.test`, role: 'customer', verified: true });

describe('useResetOnViewerChange', () => {
    let reset: () => void;

    beforeEach(() => {
        setActivePinia(createPinia());
        reset = vi.fn<() => void>();
        useResetOnViewerChange(reset);
    });

    it('stays quiet for the first sign-in', async () => {
        useSessionStore().viewer = viewerOf('a');
        await nextTick();

        expect(reset).not.toHaveBeenCalled();
    });

    it('resets when the person signs out', async () => {
        const session = useSessionStore();
        session.viewer = viewerOf('a');
        await nextTick();
        session.viewer = undefined;
        await nextTick();

        expect(reset).toHaveBeenCalledTimes(1);
    });

    it('resets when another account replaces the person', async () => {
        const session = useSessionStore();
        session.viewer = viewerOf('a');
        await nextTick();
        session.viewer = viewerOf('b');
        await nextTick();

        expect(reset).toHaveBeenCalledTimes(1);
    });

    it("stays quiet when the same person's record is refreshed", async () => {
        const session = useSessionStore();
        session.viewer = viewerOf('a');
        await nextTick();
        session.viewer = { ...viewerOf('a'), email: 'new@x.test' };
        await nextTick();

        expect(reset).not.toHaveBeenCalled();
    });
});
