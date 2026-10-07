/**
 * @module
 * The cart badge's session watch (`module.ts`) when another account takes the tab over with no
 * sign-out in between. The store empties itself for the previous person
 * (`useResetOnViewerChange`); the badge must then be filled for the new one, or the header shows
 * a bare cart to someone who has items in it, and a guest cart left on the device is not merged.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick } from 'vue';
import cartModule from '../module.ts';
import { useCartStore } from '../store.ts';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { asStub } from '../../../../tests/support/stub.ts';

beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
});

describe('another account taking the tab over', () => {
    it('is seeded for, like any session that appears', async () => {
        const seed = vi.spyOn(useCartStore(), 'seedAfterSignIn').mockResolvedValue(undefined);
        const session = useSessionStore();
        session.viewer = asStub<SessionViewer>({ id: 'a', email: 'a@example.com' });
        session.accessToken = 'tok-a';
        session.setAbilities({ tenant: [['update', 'Cart']], platform: [] });
        effectScope().run(() => cartModule.navigation?.[0]?.badge?.());
        await nextTick();
        expect(seed).toHaveBeenCalledTimes(1);

        session.viewer = asStub<SessionViewer>({ id: 'b', email: 'b@example.com' });
        session.accessToken = 'tok-b';
        await nextTick();

        expect(seed).toHaveBeenCalledTimes(2);
    });
});
