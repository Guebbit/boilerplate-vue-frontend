/**
 * @module
 * The cart badge's session watch (`module.ts`): the header reads the cart summary when a session
 * appears, and a checkout draft must die with the session that typed it — but not with a reload,
 * which starts signed out and is restored a moment later.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick } from 'vue';

import cartModule from '@/modules/cart/module.ts';
import { useCartStore } from '@/modules/cart/store.ts';
import {
    readCheckoutDraft,
    writeCheckoutDraft
} from '@/modules/cart/composables/use-checkout-draft.ts';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { asStub } from '../../../../tests/support/stub.ts';

/**
 * Runs the cart navigation entry's `badge` setup, as the shell does, inside a scope of its own.
 */
const wireBadge = () => {
    const entry = cartModule.navigation?.[0];
    effectScope().run(() => entry?.badge?.());
};

/**
 * Signs a stub visitor in on the session store.
 */
const signIn = () => {
    const session = useSessionStore();
    session.viewer = asStub<SessionViewer>({ id: 'u1', email: 'u1@example.com' });
    session.accessToken = 'tok';
    session.setAbilities({ tenant: [['update', 'Cart']], platform: [] });
};

beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.spyOn(useCartStore(), 'fetchSummary').mockResolvedValue(undefined);
});

describe('the cart badge watching the session', () => {
    it('drops the checkout draft when the signed-in visitor logs out', () => {
        signIn();
        wireBadge();
        writeCheckoutDraft('u1', { notes: 'Ring twice' });

        const session = useSessionStore();
        session.accessToken = undefined;

        return nextTick().then(() => {
            expect(readCheckoutDraft('u1')).toEqual({ notes: '' });
        });
    });

    it('keeps the draft through a reload, which starts signed out and is restored a moment later', () => {
        writeCheckoutDraft('u1', { notes: 'Ring twice' });
        wireBadge();

        signIn();

        return nextTick().then(() => {
            expect(readCheckoutDraft('u1')).toEqual({ notes: 'Ring twice' });
        });
    });
});

describe('the cart badge reading the summary', () => {
    it('reads it for a session that may shop', () => {
        const summary = vi.spyOn(useCartStore(), 'fetchSummary').mockResolvedValue(undefined);
        signIn();
        wireBadge();

        return nextTick().then(() => {
            expect(summary).toHaveBeenCalledTimes(1);
        });
    });

    it('never asks for it from a session that holds no cart key, which would only be refused', () => {
        const summary = vi.spyOn(useCartStore(), 'fetchSummary').mockResolvedValue(undefined);
        signIn();
        useSessionStore().setAbilities({ tenant: [], platform: [] });
        wireBadge();

        return nextTick().then(() => {
            expect(summary).not.toHaveBeenCalled();
        });
    });
});
