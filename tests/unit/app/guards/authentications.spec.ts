import { asStub } from '../../../support/stub';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { canAccess, enforceRouteAccess } from '@/app/guards/authentications';
import type { RouteAccess, RoutePermission } from '@/app/guards/authentications';
import type { PermissionAction } from '@/infrastructure/session';
import type { RouteLocationNormalized } from 'vue-router';

const addMessageMock = vi.fn();

/**
 * The rules the mocked session answers with — a set of `"action subject"` strings rather than a
 * real `Ability`, since what these tests exercise is the guard's own logic, not CASL's.
 */
const held = new Set<string>();

const visitorStanding = { isAuth: ref(false) };

vi.mock('@/infrastructure/session', () => ({
    useSessionStore: () => ({
        can: (action: string, subject: string) => held.has(`${action} ${subject}`)
    })
}));

vi.mock('pinia', () => ({
    storeToRefs: () => visitorStanding
}));

vi.mock('@guebbit/vue-toolkit', () => ({
    useNotificationsStore: () => ({
        addMessage: addMessageMock
    })
}));

vi.mock('@/infrastructure/i18n', () => ({
    // Identity, so the assertions below read the dictionary KEY rather than a translation that
    // would change with the locale.
    translate: (key: string) => key
}));

/** A route carrying just what `enforceRouteAccess` reads off it. */
const route = (access?: RouteAccess, can?: RoutePermission) =>
    asStub<RouteLocationNormalized>({
        fullPath: '/en/target',
        params: { locale: 'en' },
        meta: { ...(access ? { access } : {}), ...(can ? { can } : {}) }
    });

/** A visitor of the given standing, answering rules from the given `"action subject"` list. */
const visitor = (isAuth: boolean, ...rules: string[]) => ({
    isAuth,
    can: (action: PermissionAction, subject: string) => rules.includes(`${action} ${subject}`)
});

const guest = visitor(false);
const customer = visitor(true);
const editor = visitor(true, 'update Product', 'read Translation');
const owner = visitor(true, 'update Product', 'read Translation', 'read User');

describe('canAccess', () => {
    /*
     * Exhaustive rather than illustrative: it is a pure function of a small standing and one rule,
     * so the whole truth table is cheaper than choosing which rows matter — and the rows nobody
     * thinks to test (a signed-in visitor on a guest-only page) are exactly where an access rule
     * goes wrong.
     */
    it.each([
        ['public', {}, guest, true],
        ['public', {}, customer, true],
        ['public', {}, owner, true],
        ['guest-only', { access: 'guest' }, guest, true],
        ['guest-only', { access: 'guest' }, customer, false],
        ['guest-only', { access: 'guest' }, owner, false],
        ['auth-only', { access: 'auth' }, guest, false],
        ['auth-only', { access: 'auth' }, customer, true],
        ['auth-only', { access: 'auth' }, owner, true],
        // The permission half. A rule always implies a session: rules are published for a caller
        // the server identified, so a stranger is refused before the ability is consulted.
        ['product-write', { access: 'auth', can: ['update', 'Product'] }, guest, false],
        ['product-write', { access: 'auth', can: ['update', 'Product'] }, customer, false],
        ['product-write', { access: 'auth', can: ['update', 'Product'] }, editor, true],
        ['product-write', { access: 'auth', can: ['update', 'Product'] }, owner, true],
        // The rule is the whole requirement, and holding a DIFFERENT one is not a partial answer:
        // this is what the old coarse gate got wrong, letting anyone who could edit a product
        // reach a screen about accounts.
        ['user-read', { access: 'auth', can: ['read', 'User'] }, editor, false],
        ['user-read', { access: 'auth', can: ['read', 'User'] }, owner, true],
        // A rule with no `access`: still refused for a stranger, on the same reasoning.
        ['rule-only', { can: ['read', 'User'] }, guest, false],
        ['rule-only', { can: ['read', 'User'] }, owner, true]
    ] as const)('%s route -> %s', (_label, meta, who, expected) => {
        expect(canAccess(meta, who)).toBe(expected);
    });
});

describe('enforceRouteAccess', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        visitorStanding.isAuth.value = false;
        held.clear();
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
        expect(JSON.stringify(enforceRouteAccess(route('auth', ['read', 'User'])))).toContain(
            '/en/target'
        );
    });

    it('sends an authenticated visitor without the rule home, with no continue target', () => {
        visitorStanding.isAuth.value = true;

        const result = enforceRouteAccess(route('auth', ['read', 'User']));

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-forbidden');
        // Logging in again cannot grant a permission, so offering to continue would loop them.
        expect(result).toEqual({ name: 'Home', params: { locale: 'en' } });
    });

    it('sends an authenticated visitor away from a guest-only route', () => {
        visitorStanding.isAuth.value = true;

        const result = enforceRouteAccess(route('guest'));

        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-already-logged');
        expect(result).toEqual({ name: 'Home', params: { locale: 'en' } });
    });

    it('lets a visitor holding the rule through', () => {
        visitorStanding.isAuth.value = true;
        held.add('read User');

        expect(enforceRouteAccess(route('auth', ['read', 'User']))).toBeUndefined();
        expect(addMessageMock).not.toHaveBeenCalled();
    });

    it('refuses a visitor who holds a different rule on the same subject', () => {
        // `read` is not `update`, and the guard must not treat one as evidence of the other —
        // the server does not.
        visitorStanding.isAuth.value = true;
        held.add('read User');

        expect(enforceRouteAccess(route('auth', ['update', 'User']))).toEqual({
            name: 'Home',
            params: { locale: 'en' }
        });
        expect(addMessageMock).toHaveBeenCalledWith('navigation.error-forbidden');
    });
});
