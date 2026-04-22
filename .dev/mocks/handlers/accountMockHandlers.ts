import type MockAdapter from 'axios-mock-adapter';
import type { LoginRequest, User } from '@/types';
import {
    createMessageResponse,
    defaultRefreshTokenResponse,
    getIsoDateNow,
    mockDatabase,
    parseRequestBody
} from '../shared/mockShared.ts';
import { toMockReply } from '../shared/mockTransport.ts';

export const registerAccountMockHandlers = (mockAdapter: MockAdapter) => {
    mockAdapter
        .onGet(/\/account\/refresh\/[^/?]+(?:\?.*)?$/)
        .reply(() => toMockReply(defaultRefreshTokenResponse));
    mockAdapter.onGet(/\/account\/refresh(?:\?.*)?$/).reply(() => toMockReply(defaultRefreshTokenResponse));

    mockAdapter.onGet(/\/account(?:\?.*)?$/).reply(() => {
        const currentUser =
            mockDatabase.sampleUsers.find(
                (user) => user.id === mockDatabase.currentAuthenticatedUserId
            ) ?? mockDatabase.sampleUsers[0];
        return toMockReply(currentUser);
    });

    mockAdapter.onPost(/\/account\/login(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<LoginRequest>(config.data);
        const matchedUser = mockDatabase.sampleUsers.find(
            (user) => user.email.toLowerCase() === String(requestBody.email ?? '').toLowerCase()
        );
        if (!matchedUser)
            return toMockReply(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } },
                { status: 401 }
            );
        mockDatabase.currentAuthenticatedUserId = matchedUser.id;
        return toMockReply({
            token: `mock-token-for-${matchedUser.id}`,
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600
        });
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
        return toMockReply(createdUser, { status: 201 });
    });

    mockAdapter
        .onPost(/\/account\/reset(?:\?.*)?$/)
        .reply(() => toMockReply(createMessageResponse('Password reset email sent')));
    mockAdapter
        .onPost(/\/account\/reset-confirm(?:\?.*)?$/)
        .reply(() => toMockReply(createMessageResponse('Password reset confirmed')));
    mockAdapter
        .onPost(/\/account\/logout-all(?:\?.*)?$/)
        .reply(() => toMockReply(createMessageResponse('Logged out from all devices')));
    mockAdapter
        .onDelete(/\/account\/tokens\/expired(?:\?.*)?$/)
        .reply(() => toMockReply(createMessageResponse('Expired tokens removed')));
};
