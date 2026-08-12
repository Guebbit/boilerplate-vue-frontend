/**
 * The user directory's random-profile generator. Loaded only when `VITE_MOCK_PROFILE=random` —
 * see `@mocks/mockRandom.ts` for the gate and the constraints.
 */
import type { User } from '@types';
import { ListUsersResponse } from '@api/schemas';
import { faker } from '@mocks/mockRandom.ts';
import { getListUsersResponseMock } from '@mocks/generated.ts';
import { assertMockContract } from '@mocks/mockValidation.ts';

/*
 * Constraint 3 in `mockRandom.ts`: `cy.loginAs()` types these into a real login form, so identity
 * cannot be randomised. Hard-coded rather than read from `@mocks/seed-identities.ts` because that
 * file describes the SEED profile's dataset; what this profile needs from it is only the two
 * credentials the E2E suite signs in with, and coupling the random profile to the whole shared
 * fixture would make a seed-data edit change what "random" means.
 */
const MOCK_ADMIN_ID = '65dd2bdb923652b7800fe180';
const MOCK_ADMIN_EMAIL = 'root@root.it';
const MOCK_USER_ID = '65de646a44f861fd83c13f13';
const MOCK_USER_EMAIL = 'gino@pino.it';

export const buildRandomUsers = (): User[] => {
    const templates = getListUsersResponseMock().data.items as User[];
    const cosmeticFor = (index: number) => templates[index % templates.length];
    const adminCosmetic = cosmeticFor(0);
    const userCosmetic = cosmeticFor(1);

    // id/email/admin/active are the fixed identity `cy.loginAs()` depends on (constraint 3);
    // only username/imageUrl/timestamps come from the generated templates.
    const users: User[] = [
        {
            id: MOCK_ADMIN_ID,
            email: MOCK_ADMIN_EMAIL,
            admin: true,
            active: true,
            username: adminCosmetic.username,
            imageUrl: adminCosmetic.imageUrl,
            createdAt: adminCosmetic.createdAt,
            updatedAt: adminCosmetic.updatedAt
        },
        {
            id: MOCK_USER_ID,
            email: MOCK_USER_EMAIL,
            admin: false,
            active: true,
            username: userCosmetic.username,
            imageUrl: userCosmetic.imageUrl,
            createdAt: userCosmetic.createdAt,
            updatedAt: userCosmetic.updatedAt
        }
    ];

    assertMockContract(ListUsersResponse, {
        success: true,
        status: 200,
        message: 'mock-profile:random',
        data: {
            items: users,
            meta: { page: 1, pageSize: users.length, totalItems: users.length, totalPages: 1 }
        }
    });
    return users;
};
