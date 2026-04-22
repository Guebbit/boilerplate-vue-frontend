import type MockAdapter from 'axios-mock-adapter';
import type { LoginRequest, User } from '@/types';
import {
    createMessageResponse,
    defaultRefreshTokenResponse,
    getIsoDateNow,
    mockDatabase,
    parseRequestBody
} from '../shared/mockShared.ts';

export const registerAccountMockHandlers = (mockAdapter: MockAdapter) => {
    mockAdapter
        .onGet(/\/account\/refresh\/[^/?]+(?:\?.*)?$/)
        .reply(200, defaultRefreshTokenResponse);
    mockAdapter.onGet(/\/account\/refresh(?:\?.*)?$/).reply(200, defaultRefreshTokenResponse);

    mockAdapter.onGet(/\/account(?:\?.*)?$/).reply(() => {
        const currentUser =
            mockDatabase.sampleUsers.find(
                (user) => user.id === mockDatabase.currentAuthenticatedUserId
            ) ?? mockDatabase.sampleUsers[0];
        return [200, currentUser];
    });

    mockAdapter.onPost(/\/account\/login(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<LoginRequest>(config.data);
        const matchedUser = mockDatabase.sampleUsers.find(
            (user) => user.email.toLowerCase() === String(requestBody.email ?? '').toLowerCase()
        );
        if (!matchedUser)
            return [
                401,
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }
            ];
        mockDatabase.currentAuthenticatedUserId = matchedUser.id;
        return [
            200,
            {
                token: `mock-token-for-${matchedUser.id}`,
                refreshToken: 'mock-refresh-token',
                expiresIn: 3600
            }
        ];
    });

    mockAdapter.onPost(/\/account\/signup(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const createdUser: User = {
            id: `user-${Date.now()}`,
            email: String(requestBody.email ?? 'new.user@example.com'),
            username: String(requestBody.username ?? 'new-user'),
            admin: false,
            active: true,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        };
        mockDatabase.sampleUsers.unshift(createdUser);
        return [201, createdUser];
    });

    mockAdapter
        .onPost(/\/account\/reset(?:\?.*)?$/)
        .reply(200, createMessageResponse('Password reset email sent'));
    mockAdapter
        .onPost(/\/account\/reset-confirm(?:\?.*)?$/)
        .reply(200, createMessageResponse('Password reset confirmed'));
    mockAdapter
        .onPost(/\/account\/logout-all(?:\?.*)?$/)
        .reply(200, createMessageResponse('Logged out from all devices'));
    mockAdapter
        .onDelete(/\/account\/tokens\/expired(?:\?.*)?$/)
        .reply(200, createMessageResponse('Expired tokens removed'));
};
