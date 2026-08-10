/**
 * `loginContinueTo` — `src/router/navigation.ts`.
 *
 * One small function with one branch, and the branch is the whole point: a visitor bounced to login
 * should land back where they were aiming, EXCEPT when where they were aiming is an error page.
 * Sending someone back to `/en/error/403` after they successfully log in shows them the failure
 * again and hides the fact that logging in worked.
 *
 * It had no test of its own. The branch was reached only incidentally, by whichever guard spec
 * happened to pass a path through it, so which side was exercised depended on fixtures chosen for
 * other reasons — and the error-page side was never one of them.
 */
import { describe, expect, it } from 'vitest';
import { loginContinueTo } from '@/router/navigation';

describe('loginContinueTo', () => {
    it('remembers an ordinary target as a continue query', () => {
        expect(loginContinueTo('/en/cart', 'en')).toEqual({
            name: 'Login',
            params: { locale: 'en' },
            query: { continue: '/en/cart' }
        });
    });

    it('omits the continue query for an error page', () => {
        // Nobody wants to be sent back to the error they just recovered from.
        expect(loginContinueTo('/en/error/403/navigation.error-forbidden', 'en')).toEqual({
            name: 'Login',
            params: { locale: 'en' }
        });
    });

    it('carries no params at all when no locale is given', () => {
        // `undefined` rather than `{}`: an empty params object makes vue-router resolve a
        // locale-less `Login`, which the `/:locale` parent cannot match.
        expect(loginContinueTo('/cart')).toEqual({
            name: 'Login',
            params: undefined,
            query: { continue: '/cart' }
        });
    });

    it('omits params AND continue for an error page with no locale', () => {
        expect(loginContinueTo('/error/500')).toEqual({ name: 'Login', params: undefined });
    });

    it('matches on the word anywhere in the path, not only as a leading segment', () => {
        // The check is `includes`, so a nested error route is covered too. Pinned because
        // tightening it to `startsWith` would silently reintroduce the bounce-back.
        expect(loginContinueTo('/en/admin/error/500', 'en')).toEqual({
            name: 'Login',
            params: { locale: 'en' }
        });
    });
});
