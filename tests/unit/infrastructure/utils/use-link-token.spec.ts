/**
 * The fragment a mailed link carries its one-time token in: how it is read, how it is told apart
 * from a real anchor, and that the cleanup drops it from the URL without a new history entry.
 */
import { describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router';
import { asStub } from '../../../support/stub';
import {
    isAnchorHash,
    readLinkToken,
    useLinkTokenCleanup
} from '@/infrastructure/utils/use-link-token.ts';

/** A render function that draws nothing; the probe only needs `setup` to run. */
const noRender = (): null => null;

/** A route carrying just the pieces these helpers read. */
const routeWith = (hash: string): RouteLocationNormalizedLoaded =>
    asStub<RouteLocationNormalizedLoaded>({ path: '/en/password-reset/confirm', hash });

describe('readLinkToken', () => {
    it('reads the token out of the fragment', () => {
        expect(readLinkToken(routeWith('#token=abc123'))).toBe('abc123');
    });

    it('decodes what the backend percent-encoded', () => {
        expect(readLinkToken(routeWith('#token=a%2Fb%26c%3Dd'))).toBe('a/b&c=d');
    });

    it('answers an empty string when there is no fragment or no token in it', () => {
        expect(readLinkToken(routeWith(''))).toBe('');
        expect(readLinkToken(routeWith('#section'))).toBe('');
    });
});

describe('isAnchorHash', () => {
    it('is true for an in-page anchor', () => {
        expect(isAnchorHash('#details')).toBe(true);
    });

    it('is false for a key/value fragment and for no fragment at all', () => {
        expect(isAnchorHash('#token=abc')).toBe(false);
        expect(isAnchorHash('')).toBe(false);
    });
});

describe('useLinkTokenCleanup', () => {
    it('replaces the route with its own path and no fragment, once mounted', () => {
        const replace = vi.fn().mockResolvedValue(undefined);
        const router = asStub<Router>({ replace });
        const Probe = defineComponent({
            setup: () => {
                useLinkTokenCleanup(routeWith('#token=abc'), router);
                return noRender;
            }
        });

        expect(replace).not.toHaveBeenCalled();
        mount(Probe);

        expect(replace).toHaveBeenCalledWith({ path: '/en/password-reset/confirm', hash: '' });
    });
});
