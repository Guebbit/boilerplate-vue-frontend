/**
 * `loginContinueTo` — `src/app/router/navigation.ts`.
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
import { loginContinueTo, SIGN_IN_ROUTE_NAME, signInLocation } from '@/app/router/navigation';

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

/**
 * `signInLocation` — the guard that keeps the shell working in a build with no sign-in route.
 *
 * The route name is a string the account module owns, so nothing type-checks it. With that module
 * deleted, an unguarded 401 pushes at a route that does not resolve, which aborts the navigation
 * and strands the visitor with no explanation.
 */
const routerWith = (names: string[]) => ({ hasRoute: (name: string) => names.includes(name) });

describe('signInLocation', () => {
    it('points at the sign-in route when this build has one', () => {
        expect(signInLocation(routerWith([SIGN_IN_ROUTE_NAME]), '/en/cart', 'en')).toEqual(
            loginContinueTo('/en/cart', 'en')
        );
    });

    it('falls back to Home when no sign-in route is registered', () => {
        expect(signInLocation(routerWith([]), '/en/cart', 'en')).toEqual({
            name: 'Home',
            params: { locale: 'en' }
        });
    });

    it('omits params in the fallback when no locale is given', () => {
        expect(signInLocation(routerWith([]), '/en/cart')).toEqual({
            name: 'Home',
            params: undefined
        });
    });
});
