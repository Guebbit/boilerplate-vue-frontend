/**
 * @module
 * The cart page's stock poll, with fake timers over the real store: opt-in by a knob (unset, `0`
 * or invalid means no timer and no listener at all), then a plain interval re-read of `GET /cart`
 * while someone is signed in and the tab is visible. It re-reads once when the tab comes back, skips
 * a tick while a write is in flight, and stops for good on logout, an account switch or unmount.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick } from 'vue';
import type { EffectScope } from 'vue';
import { useCartStockPoll } from '../composables/use-cart-stock-poll';
import { useCartStore } from '../store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { getCart } from '@api';
import {
    aCart,
    gate,
    answered,
    type Answer
} from '../../../../tests/support/unit/cart-fixtures.ts';
import { ACTIONS, issue, signInAs } from '../../../../tests/support/unit/cart-interleave.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@api', () => ({
    getCart: vi.fn(),
    getCartSummary: vi.fn(),
    addCartItem: vi.fn(),
    updateCartItemById: vi.fn(),
    removeCartItem: vi.fn(),
    clearCart: vi.fn(),
    mergeCart: vi.fn(),
    setCartShippingMethod: vi.fn(),
    checkout: vi.fn(),
    reorder: vi.fn()
}));

/**
 * The knob's name in the environment.
 */
const KNOB = 'VITE_CART_STOCK_POLL_SECONDS';

/**
 * The scope the poll was started in, standing in for the cart page's setup; stopped after each case.
 */
let scope: EffectScope | undefined;

/**
 * What the tab reports for `document.visibilityState`.
 */
let visibility: 'visible' | 'hidden';

/**
 * Signs a person in the way the session does: `isAuth` needs a token and a viewer.
 *
 * @param id - The viewer's id
 * @returns A promise settling once the store's watchers have run
 */
const signedIn = (id: string) => {
    useSessionStore().accessToken = 'test-token';
    return signInAs(id);
};

/**
 * Opens the "cart page": starts the poll inside a scope, as the page's setup does.
 *
 * @returns The cart store the poll drives
 */
const openPage = () => {
    const store = useCartStore();
    scope = effectScope();
    scope.run(useCartStockPoll);
    return store;
};

/**
 * Shows or hides the tab, as the browser does: the state changes, then the event fires.
 *
 * @param next - The new visibility
 * @returns A promise settling once the poll's watchers have run
 */
const setVisibility = (next: 'visible' | 'hidden') => {
    visibility = next;
    document.dispatchEvent(new Event('visibilitychange'));
    return nextTick();
};

/**
 * Lets `seconds` of fake time pass, with the promises each tick starts settling.
 *
 * @param seconds - How long
 * @returns A promise settling once they have
 */
const passSeconds = (seconds: number) => vi.advanceTimersByTimeAsync(seconds * 1000);

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
});

afterEach(() => {
    scope?.stop();
    scope = undefined;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('the knob: no polling unless it asks for it', () => {
    it.each([
        ['unset', undefined],
        ['empty', ''],
        ['zero', '0'],
        ['negative', '-3'],
        ['not a number', 'often'],
        ['fractional', '1.5']
    ])('sets no timer and no listener when it is %s', async (_name, value) => {
        if (value !== undefined) vi.stubEnv(KNOB, value);
        await signedIn('u1');
        const addListener = vi.spyOn(document, 'addEventListener');

        openPage();
        await passSeconds(3600);

        expect(vi.getTimerCount()).toBe(0);
        expect(addListener).not.toHaveBeenCalledWith('visibilitychange', expect.anything());
        expect(getCart).not.toHaveBeenCalled();
    });

    it('polls every N seconds when it is a positive whole number', async () => {
        vi.stubEnv(KNOB, '10');
        await signedIn('u1');
        openPage();

        await passSeconds(9);
        expect(getCart).not.toHaveBeenCalled();
        await passSeconds(1);
        expect(getCart).toHaveBeenCalledTimes(1);
        await passSeconds(30);
        expect(getCart).toHaveBeenCalledTimes(4);
    });

    it("takes a container's runtime value over the build's", async () => {
        vi.stubEnv(KNOB, '10');
        vi.stubGlobal('__APP_CONFIG', { CART_STOCK_POLL_SECONDS: '2' });
        await signedIn('u1');
        openPage();

        await passSeconds(2);

        expect(getCart).toHaveBeenCalledTimes(1);
    });

    it('does not read the cart at the moment the page opens: the page has just done it', async () => {
        vi.stubEnv(KNOB, '10');
        await signedIn('u1');

        openPage();
        await nextTick();

        expect(getCart).not.toHaveBeenCalled();
    });

    it('puts what the server answers in the store, so a line turning short shows up', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        const store = openPage();
        vi.mocked(getCart).mockResolvedValue({
            data: aCart([['p1', 2]], null, ['p1'])
        } as never);

        await passSeconds(5);

        expect(store.cartItems[0]?.insufficientStock).toBe(true);
    });
});

describe('only for a signed-in person', () => {
    it('never polls a guest', async () => {
        vi.stubEnv(KNOB, '5');

        openPage();
        await passSeconds(60);

        expect(vi.getTimerCount()).toBe(0);
        expect(getCart).not.toHaveBeenCalled();
    });

    it('stops for good on logout, and does not come back with the next sign-in', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        openPage();
        await passSeconds(5);
        expect(getCart).toHaveBeenCalledTimes(1);

        await signInAs();
        await passSeconds(60);
        expect(getCart).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);

        await signedIn('u1');
        await passSeconds(60);
        expect(getCart).toHaveBeenCalledTimes(1);
    });

    it('stops when another account takes the tab over', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        openPage();

        await signInAs('u2');
        await passSeconds(60);

        expect(getCart).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('stops when the page goes away', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        openPage();

        scope?.stop();
        await passSeconds(60);

        expect(getCart).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('stops listening for the tab hiding when the page goes away', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        const removeListener = vi.spyOn(document, 'removeEventListener');
        openPage();

        scope?.stop();

        expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.anything());
    });
});

describe('a hidden tab', () => {
    it('pauses while hidden', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        openPage();
        await passSeconds(5);
        expect(getCart).toHaveBeenCalledTimes(1);

        await setVisibility('hidden');
        await passSeconds(60);

        expect(getCart).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('re-reads once as soon as it is visible again, then resumes the interval', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        openPage();
        await setVisibility('hidden');
        await passSeconds(60);
        expect(getCart).not.toHaveBeenCalled();

        await setVisibility('visible');
        await vi.advanceTimersByTimeAsync(0);
        expect(getCart).toHaveBeenCalledTimes(1);

        await passSeconds(5);
        expect(getCart).toHaveBeenCalledTimes(2);
    });

    it('does not poll at all for a page that opens in a hidden tab, until it shows', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        visibility = 'hidden';
        openPage();

        await passSeconds(60);
        expect(getCart).not.toHaveBeenCalled();

        await setVisibility('visible');
        await vi.advanceTimersByTimeAsync(0);
        expect(getCart).toHaveBeenCalledTimes(1);
    });

    it('re-reads on becoming visible only when it was hidden, not on a repeated event', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        openPage();

        await setVisibility('visible');
        await setVisibility('visible');
        await vi.advanceTimersByTimeAsync(0);

        expect(getCart).not.toHaveBeenCalled();
    });
});

describe('next to the shopper’s own writes', () => {
    it('skips a tick while a write is in flight, and polls at the next one after it answered', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        const store = openPage();
        const write = await issue(store, ACTIONS.update);

        await passSeconds(15);
        expect(getCart).not.toHaveBeenCalled();

        write.answer(aCart([['p1', 5]]));
        await write.settled;
        await passSeconds(5);
        expect(getCart).toHaveBeenCalledTimes(1);
    });

    it('keeps the write’s answer when an older poll answers after it', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        const store = openPage();
        const pollAnswer = gate<Answer<typeof getCart>>();
        vi.mocked(getCart).mockReturnValueOnce(pollAnswer.promise);
        await passSeconds(5);
        const write = await issue(store, ACTIONS.update);
        const written = aCart([['p1', 5]]);

        write.answer(written);
        await write.settled;
        pollAnswer.resolve(answered(aCart([['p1', 2]])));
        await vi.advanceTimersByTimeAsync(0);

        expect(store.cart).toEqual(written);
    });

    it('does not pile a second read on a slow one', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        openPage();
        vi.mocked(getCart).mockReturnValue(new Promise(() => undefined) as never);

        await passSeconds(60);

        expect(getCart).toHaveBeenCalledTimes(1);
    });

    it('survives a failed read and tries again at the next tick', async () => {
        vi.stubEnv(KNOB, '5');
        await signedIn('u1');
        const store = openPage();
        vi.mocked(getCart).mockRejectedValueOnce(new Error('Network Error'));

        await passSeconds(5);
        await passSeconds(5);

        expect(getCart).toHaveBeenCalledTimes(2);
        expect(store.cart).toEqual(aCart([['p1', 2]]));
    });
});
