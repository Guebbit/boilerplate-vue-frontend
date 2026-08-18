/**
 * This module's slice of the mock database. See `src/modules/products/tests/seeds.spec.ts` for why
 * it is asserted here rather than centrally.
 */
import { describe, expect, it } from 'vitest';
import { buildUsersMockSeeds } from '@/modules/users/mocks/register';

const build = () => buildUsersMockSeeds().then(({ sampleUsers }) => sampleUsers ?? []);

/*
 * `cy.loginAs()` types these credentials into a real login form, so the two identities are pinned
 * here: a slice that dropped or renamed one would break login itself, in every e2e spec at once.
 */
describe('the demo directory', () => {
    it('keeps the two seeded identities fixed', async () => {
        const users = await build();

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

    it('pins active true, so login never fails on an inactive account', async () => {
        const users = await build();

        expect(users.every((user) => user.active)).toBe(true);
    });
});
