/**
 * @module
 * Pins the `meta.access` every account route declares, asserted against the module's own route
 * records rather than a resolved router — needs neither the locale prefix nor the rest of the app.
 *
 * A route that quietly loses `meta.access` is indistinguishable from a public one, which is why
 * each expected value is written out rather than derived. Lives with the module as a fact about
 * THIS domain (see `docs/theory/modules.md`); the router spec proves enforcement is *attached*,
 * this proves the declarations are *there*.
 */
import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import routes from '../routes';

/**
 * Looks up one of this module's routes by name.
 */
const byName = (name: string): RouteRecordRaw | undefined =>
    routes.find((route) => route.name === name);

describe('account route access', () => {
    it.each([
        ['Login', 'guest'],
        ['Signup', 'guest'],
        ['PasswordResetRequest', 'guest'],
        ['PasswordResetConfirm', 'guest'],
        ['AccountDeleteConfirm', undefined],
        ['VerifyEmailConfirm', undefined],
        ['Profile', 'auth'],
        ['Logout', undefined]
    ])('%s declares access: %s', (name, access) => {
        expect(byName(name)).toBeDefined();
        expect(byName(name)?.meta?.access).toBe(access);
    });

    it('declares no route this file does not know about', () => {
        // Catches a new route added without an access decision being made for it.
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            [
                'Login',
                'Signup',
                'PasswordResetRequest',
                'PasswordResetConfirm',
                'AccountDeleteConfirm',
                'VerifyEmailConfirm',
                'Profile',
                'Logout'
            ].toSorted()
        );
    });
});
