/**
 * @module
 * `src/app/router/announcer.ts` — the router's one-shot focus request and the live-region title.
 *
 * The interesting behaviour is the ORDER inside `consumeMainFocus`: the pending flag must survive
 * a missing landmark, because the request is made in `afterEach` while the old page's `<v-main>`
 * is still mounted and the new one has yet to render.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    MAIN_CONTENT,
    consumeMainFocus,
    requestMainFocus,
    routeAnnouncement
} from '@/app/router/announcer';

/**
 * Puts a focusable main landmark in the document and hands back its focus spy.
 *
 * `tabindex="-1"` because `<v-main>` carries it for this exact purpose: a landmark is not
 * focusable otherwise, and `focus()` on it would be a silent no-op.
 */
const mountMainLandmark = () => {
    document.body.innerHTML = '<main data-main-content tabindex="-1"></main>';
    const main = document.querySelector<HTMLElement>(MAIN_CONTENT)!;
    return { main, focus: vi.spyOn(main, 'focus') };
};

beforeEach(() => {
    document.body.innerHTML = '';
    routeAnnouncement.value = '';
    // The pending flag is module state and a test that requested focus without consuming it would
    // leak into the next one. Draining it here makes each test start from "nothing pending".
    consumeMainFocus();
});

describe('routeAnnouncement', () => {
    it('starts empty, so the live region says nothing before the first navigation', () => {
        expect(routeAnnouncement.value).toBe('');
    });
});

describe('MAIN_CONTENT', () => {
    /**
     * Pinned as a literal: it is a selector shared with `LayoutDefault.vue`'s `data-main-content`
     * attribute, and nothing else would fail if the two drifted apart.
     */
    it('selects the main landmark by its data attribute', () => {
        expect(MAIN_CONTENT).toBe('main[data-main-content]');

        document.body.innerHTML = '<main data-main-content></main><main></main>';
        expect(document.querySelectorAll(MAIN_CONTENT)).toHaveLength(1);
    });
});

describe('consumeMainFocus', () => {
    it('does nothing and reports false when no navigation asked for focus', () => {
        const { focus } = mountMainLandmark();

        expect(consumeMainFocus()).toBe(false);
        expect(focus).not.toHaveBeenCalled();
    });

    it('moves focus to the landmark once a navigation asked for it', () => {
        const { main, focus } = mountMainLandmark();
        requestMainFocus();

        expect(consumeMainFocus()).toBe(true);
        // `preventScroll` matters: the router has already restored the scroll position, and
        // focusing without it would yank the page back to the landmark.
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
        expect(document.activeElement).toBe(main);
    });

    it('is one-shot — a second call after the same request does nothing', () => {
        const { focus } = mountMainLandmark();
        requestMainFocus();
        consumeMainFocus();

        expect(consumeMainFocus()).toBe(false);
        expect(focus).toHaveBeenCalledTimes(1);
    });

    /**
     * The reason the flag is cleared AFTER the landmark lookup rather than before. `afterEach`
     * fires while the outgoing page's layout is unmounting, so the first consumer can legitimately
     * find no `<v-main>` — and the request has to still be there for the incoming one.
     */
    it('keeps the request pending when the landmark is not in the DOM yet', () => {
        requestMainFocus();

        expect(consumeMainFocus()).toBe(false);

        const { focus } = mountMainLandmark();
        expect(consumeMainFocus()).toBe(true);
        expect(focus).toHaveBeenCalledOnce();
    });
});
