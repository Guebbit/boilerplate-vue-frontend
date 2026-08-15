import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { canAccess, enforceRouteAccess } from '@/app/middlewares/authentications';
import type { RouteAccess } from '@/app/middlewares/authentications';
import type { RouteLocationNormalized } from 'vue-router';

const addMessageMock = vi.fn();
const profileRefs = {
    isAuth: ref(false),
    isAdmin: ref(false)
};

vi.mock('@/infrastructure/session', () => ({
    useSessionStore: () => ({})
}));

vi.mock('pinia', () => ({
    storeToRefs: () => profileRefs
}));

vi.mock('@guebbit/vue-toolkit', () => ({
    useNotificationsStore: () => ({
        addMessage: addMessageMock
    })
}));

vi.mock('@/infrastructure/i18n.ts', () => ({
    // Identity, so the assertions below read the dictionary KEY rather than a translation that
    // would change with the locale.
    translate: (key: string) => key
}));

/** A route carrying just what `enforceRouteAccess` reads off it. */
const route = (access?: RouteAccess) =>
    ({
        fullPath: '/en/target',
        params: { locale: 'en' },
        meta: access ? { access } : {}
    }) as unknown as RouteLocationNormalized;

const guest = { isAuth: false, isAdmin: false };
const user = { isAuth: true, isAdmin: false };
const admin = { isAuth: true, isAdmin: true };

describe('canAccess', () => {
    /*
     * Exhaustive rather than illustrative: it is a pure function of two small enums, so the whole
     * truth table is cheaper than choosing which rows matter — and the rows nobody thinks to test
     * (an admin on a guest-only page) are exactly where an access rule goes wrong.
     */
    it.each([
        ['public', undefined, guest, true],
        ['public', undefined, user, true],
        ['public', undefined, admin, true],
        ['guest-only', 'guest', guest, true],
        ['guest-only', 'guest', user, false],
        ['guest-only', 'guest', admin, false],
        ['auth-only', 'auth', guest, false],
        ['auth-only', 'auth', user, true],
        ['auth-only', 'auth', admin, true],
        ['admin-only', 'admin', guest, false],
        ['admin-only', 'admin', user, false],
        ['admin-only', 'admin', admin, true]
    ] as const)('%s route, isAuth=%o -> %s', (_label, access, visitor, expected) => {
        expect(canAccess(access, visitor)).toBe(expected);
    });
});

describe('enforceRouteAccess', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        profileRefs.isAuth.value = false;
        profileRefs.isAdmin.value = false;
    });

    it('lets a permitted navigation through without notifying anything', () => {
        expect(enforceRouteAccess(route())).toBeUndefined();
        expect(addMessageMock).not.toHaveBeenCalled();
    });

    it('sends a guest to login, remembering where they were going', () => {
        const result = enforceRouteAccess(route('auth'));

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-not-logged');
        expect(result).toEqual(
            expect.objectContaining({ name: 'Login', params: { locale: 'en' } })
        );
    });

    it('keeps the blocked path as the login continue target', () => {
        // The point of redirecting rather than 403-ing: logging in must land them where they aimed.
        expect(JSON.stringify(enforceRouteAccess(route('admin')))).toContain('/en/target');
    });

    it('sends an authenticated non-admin home, with no continue target', () => {
        profileRefs.isAuth.value = true;

        const result = enforceRouteAccess(route('admin'));

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-forbidden');
        // Logging in again cannot grant admin, so offering to continue would loop them.
        expect(result).toEqual({ name: 'Home', params: { locale: 'en' } });
    });

    it('sends an authenticated visitor away from a guest-only route', () => {
        profileRefs.isAuth.value = true;

        const result = enforceRouteAccess(route('guest'));

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-already-logged');
        expect(result).toEqual({ name: 'Home', params: { locale: 'en' } });
    });

    it('lets an admin into an admin route', () => {
        profileRefs.isAuth.value = true;
        profileRefs.isAdmin.value = true;

        expect(enforceRouteAccess(route('admin'))).toBeUndefined();
        expect(addMessageMock).not.toHaveBeenCalled();
    });
});
