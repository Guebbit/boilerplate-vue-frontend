/**
 * This module's fixtures, in both profiles. See `src/modules/products/tests/seeds.spec.ts` for why
 * they are asserted here rather than centrally.
 */
import { describe, expect, it } from 'vitest';
import { buildUsersMockSeeds } from '@/modules/users/mocks/seeds';

const build = (profile: 'seed' | 'random') =>
    buildUsersMockSeeds({ profile, soFar: {} }).then(({ sampleUsers }) => sampleUsers ?? []);

/*
 * The identity assertion is the same in both profiles, and that is the point: `cy.loginAs()` types
 * these credentials into a real login form, so randomising id/email/admin would break login itself.
 * The random profile varies only cosmetic fields.
 */
describe.each(['seed', 'random'] as const)('the %s profile', (profile) => {
    it('keeps the two seeded identities fixed', async () => {
        const users = await build(profile);

        expect(users).toEqual([
            expect.objectContaining({
                id: '65dd2bdb923652b7800fe180',
                email: 'root@root.it',
                admin: true,
                active: true
            }),
            expect.objectContaining({
                id: '65de646a44f861fd83c13f13',
                email: 'gino@pino.it',
                admin: false,
                active: true
            })
        ]);
    });

    it('pins active true, so login never randomly fails on an inactive account', async () => {
        const users = await build(profile);

        expect(users.every((user) => user.active)).toBe(true);
    });
});
