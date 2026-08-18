/**
 * Demo router guard — `src/app/middlewares/exampleGuard.ts`.
 *
 * A teaching guard, but it is registered on every navigation, so two of its properties are real
 * production concerns rather than demo details:
 *
 *   1. It must return `undefined`. Vue Router 4 treats *any* returned value as a navigation
 *      instruction — returning `false` would block every route, and returning an object would
 *      redirect. The docblock calls this out explicitly ("Returns nothing ... to let the
 *      navigation through"), and it is the single thing most easily broken by an edit.
 *   2. It must not throw when translations are not yet loaded. It runs before `App.vue`, so
 *      `t()` is being called against an i18n instance that may have no messages — the guard
 *      exists partly to demonstrate that this is survivable.
 *
 * Pinia is real here, not mocked: the point being demonstrated is that stores *do* work inside a
 * guard, and a mocked store would demonstrate nothing.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { RouteLocationNormalized } from 'vue-router';

const translateMock = vi.fn((key: string) => key);
const localeRef = { value: 'en' };

vi.mock('@/infrastructure/i18n.ts', () => ({
    i18n: {
        global: {
            get t() {
                return translateMock;
            },
            get locale() {
                return localeRef;
            }
        }
    }
}));

const { exampleGuard } = await import('@/app/middlewares/exampleGuard');
const { useCounterStore } = await import('@/app/counter');

const routeTo = (path = '/en/products') =>
    ({ path, name: 'products', params: {}, query: {} }) as unknown as RouteLocationNormalized;

let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // The guard logs on every navigation by design; silenced so the suite output stays readable
    // and so the resilience e2e spec's "no console noise" rule is not confused with unit output.
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
    consoleSpy.mockRestore();
});

describe('exampleGuard', () => {
    it('returns undefined so the navigation is allowed through', () => {
        // Not `toBeFalsy()`: `false` is falsy too, and returning `false` from a Vue Router guard
        // aborts the navigation — i.e. would break every route in the app.
        expect(exampleGuard(routeTo())).toBeUndefined();
    });

    it('increments the counter store, proving stores are reachable from a guard', () => {
        const store = useCounterStore();
        expect(store.count).toBe(0);

        exampleGuard(routeTo());

        expect(store.count).toBe(1);
    });

    it('accumulates across navigations rather than resetting', () => {
        const store = useCounterStore();

        exampleGuard(routeTo('/en'));
        exampleGuard(routeTo('/en/products'));
        exampleGuard(routeTo('/en/cart'));

        expect(store.count).toBe(3);
    });

    it('feeds the target path into the translation call', () => {
        exampleGuard(routeTo('/en/orders/42'));

        expect(translateMock).toHaveBeenCalledWith('generic.loading', { load: '/en/orders/42' });
    });

    it('survives translations that are not loaded yet', () => {
        // The documented lesson of the guard: it runs before App.vue, so `t()` may return the
        // raw key. That must be harmless, not fatal.
        translateMock.mockImplementation((key: string) => key);

        expect(() => exampleGuard(routeTo())).not.toThrow();
    });
});
