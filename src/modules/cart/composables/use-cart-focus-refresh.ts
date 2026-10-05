/**
 * @module
 * Reads the cart again when the shopper comes back to the page: the window gets focus, or the tab
 * becomes visible. The server's cart may have changed behind an open screen (another tab, the
 * wishlist, a price or a stock change), and coming back is the cheap moment to catch up before
 * "Place order". Not a poll: it fires on the event, costs nothing while the page is left alone, and
 * needs no knob. What a read may do is the store's rule (`pollCart`): it yields to any write in
 * flight and drops an answer a fresher call has overtaken. See `docs/modules/cart.md`.
 */
import { onScopeDispose } from 'vue';
import { debug } from '@/infrastructure/utils/logger.ts';
import { useCartStore } from '../store';

/**
 * Starts refreshing the cart on return for the lifetime of the calling scope (a component's setup).
 */
export const useCartFocusRefresh = (): void => {
    const cartStore = useCartStore();

    /**
     * One read. A failure is not worth a message: the page still holds the cart it had.
     */
    const refresh = () => {
        cartStore.pollCart().catch((error: unknown) => {
            debug('http', 'cart refresh on return failed, keeping the cart on screen', error);
        });
    };

    /**
     * A tab that becomes visible has been away; a tab that becomes hidden has nothing to read.
     */
    const onVisibilityChange = () => {
        if (document.visibilityState !== 'hidden') refresh();
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/focus_event
    window.addEventListener('focus', refresh);
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
    document.addEventListener('visibilitychange', onVisibilityChange);

    onScopeDispose(() => {
        window.removeEventListener('focus', refresh);
        document.removeEventListener('visibilitychange', onVisibilityChange);
    });
};
