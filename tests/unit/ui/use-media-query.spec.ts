/**
 * @module
 * `useMediaQuery` — a ref that follows a media query and lets go of it with its scope.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useMediaQuery } from '@/ui/composables/use-media-query.ts';
import { asStub } from '../../support/stub.ts';

/** A controllable `MediaQueryList`: tests flip `matches` through `fire`. */
const fakeList = (initial: boolean) => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const list = asStub<MediaQueryList>({
        matches: initial,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
            listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
            listeners.delete(listener)
    });
    return {
        list,
        listeners,
        fire: (matches: boolean) => {
            for (const listener of listeners) listener(asStub<MediaQueryListEvent>({ matches }));
        }
    };
};

describe('useMediaQuery', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('starts at the current answer and follows a change', () => {
        const { list, fire } = fakeList(false);
        vi.stubGlobal('matchMedia', () => list);

        const matches = useMediaQuery('(hover: hover)');
        expect(matches.value).toBe(false);

        fire(true);
        expect(matches.value).toBe(true);
    });

    it('asks the browser for the query it was given', () => {
        const { list } = fakeList(true);
        const matchMedia = vi.fn(() => list);
        vi.stubGlobal('matchMedia', matchMedia);

        useMediaQuery('(pointer: coarse)');

        expect(matchMedia).toHaveBeenCalledWith('(pointer: coarse)');
    });

    it('removes its listener when the scope stops', () => {
        const { list, listeners } = fakeList(false);
        vi.stubGlobal('matchMedia', () => list);
        const scope = effectScope();
        scope.run(() => useMediaQuery('(hover: hover)'));
        expect(listeners.size).toBe(1);

        scope.stop();

        expect(listeners.size).toBe(0);
    });
});
