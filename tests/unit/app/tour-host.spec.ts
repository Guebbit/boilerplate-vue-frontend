/**
 * @module
 * `AppTourHost.vue` — the two things that open a tour: the first sign-in on a browser (the welcome
 * tour, once abilities arrived, never from the sign-in screen, never twice) and a `?tour=` query
 * (known ids open and lose the parameter, unknown ids are dropped without a word). `useTour` is
 * mocked: driver.js itself is `tours.spec.ts`'s job.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppTourHost from '@/app/tours/AppTourHost.vue';
import { useSessionStore } from '@/infrastructure/session.ts';

/** The runner's calls, and what it claims to have seen. */
const startTour = vi.fn(() => Promise.resolve(true));
const seen = new Set<string>();

vi.mock('@/app/tours/use-tour.ts', () => ({
    useTour: () => ({ startTour, hasSeen: (id: string) => seen.has(id) })
}));

/** A stand-in page. */
const page = { template: '<p>page</p>' };

/** Router with a sign-in route named as the shell expects. */
const makeRouter = () =>
    createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', name: 'Home', component: page },
            { path: '/login', name: 'Login', component: page }
        ]
    });

/** Mounts the host under a router sitting at `path`. */
const mountHost = async (path = '/') => {
    const router = makeRouter();
    await router.push(path);
    const wrapper = mount(AppTourHost, { global: { plugins: [router] } });
    await flushPromises();
    return { router, wrapper };
};

/** Signs an account in with the given rules count, the way the session store holds one. */
const signIn = (rules: number) => {
    const session = useSessionStore();
    session.viewer = { id: 'acc-1', email: 'a@b.c', role: 'user' };
    // Packed rules: `[action, subject, conditions]` rows, as `GET /account/abilities` sends them.
    session.setAbilities({
        tenant: Array.from(
            { length: rules },
            () => ['read', 'Product', { tenantId: 't1' }] as const
        ).map((rule) => [...rule]),
        platform: []
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    startTour.mockClear();
    seen.clear();
});

describe('AppTourHost', () => {
    it('opens the welcome tour for a signed-in account that has not seen it', async () => {
        signIn(1);
        await mountHost();

        expect(startTour).toHaveBeenCalledWith('welcome');
    });

    it('stays quiet for a guest', async () => {
        await mountHost();

        expect(startTour).not.toHaveBeenCalled();
    });

    it('waits for the abilities, since the menu the tour points at renders from them', async () => {
        signIn(0);
        await mountHost();

        expect(startTour).not.toHaveBeenCalled();
    });

    it('does not reopen a tour already seen', async () => {
        signIn(1);
        seen.add('welcome');
        await mountHost();

        expect(startTour).not.toHaveBeenCalled();
    });

    it('does not cover the sign-in screen', async () => {
        signIn(1);
        await mountHost('/login');

        expect(startTour).not.toHaveBeenCalled();
    });

    it('opens a known ?tour= and strips the parameter, keeping the others', async () => {
        const { router } = await mountHost('/?tour=checkout&page=2');

        expect(startTour).toHaveBeenCalledWith('checkout');
        expect(router.currentRoute.value.query).toEqual({ page: '2' });
    });

    it('drops an unknown ?tour= without opening anything', async () => {
        const { router } = await mountHost('/?tour=nonsense');

        expect(startTour).not.toHaveBeenCalled();
        expect(router.currentRoute.value.query).toEqual({});
    });
});
