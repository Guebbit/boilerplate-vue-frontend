import { http, type HttpHandler } from 'msw';
import type { LoginRequest, User } from '@/types';
import {
    createMessageResponse,
    defaultRefreshTokenResponse,
    getIsoDateNow,
    mockDatabase,
    readRequestBody,
    resetMockDatabase
} from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

export const registerAccountMockHandlers = (): HttpHandler[] => [
    http.post('/__mock/reset', () => {
        resetMockDatabase();
        return toMockJsonResponse(createMessageResponse('Mock state reset'));
    }),
    http.get(/\/account\/refresh\/[^/?]+(?:\?.*)?$/, () =>
        toMockJsonResponse(defaultRefreshTokenResponse)
    ),
    http.get(/\/account\/refresh(?:\?.*)?$/, () => toMockJsonResponse(defaultRefreshTokenResponse)),
    http.get(/\/account(?:\?.*)?$/, () => {
        const currentUser =
            mockDatabase.sampleUsers.find((user) => user.id === mockDatabase.currentAuthenticatedUserId) ??
            mockDatabase.sampleUsers[0];
        return toMockJsonResponse(currentUser);
    }),
    http.post(/\/account\/login(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<LoginRequest>(request);
        const matchedUser = mockDatabase.sampleUsers.find(
            (user) => user.email.toLowerCase() === String(requestBody.email ?? '').toLowerCase()
        );

        if (!matchedUser)
            return toMockJsonResponse(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } },
                { status: 401 }
            );

        mockDatabase.currentAuthenticatedUserId = matchedUser.id;
        return toMockJsonResponse({
            token: `mock-token-for-${matchedUser.id}`,
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600
        });
    }),
    http.post(/\/account\/signup(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
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
        mockDatabase.currentAuthenticatedUserId = createdUser.id;
        return toMockJsonResponse(createdUser, { status: 201 });
    }),
    http.post(/\/account\/reset(?:\?.*)?$/, () =>
        toMockJsonResponse(createMessageResponse('Password reset email sent'))
    ),
    http.post(/\/account\/reset-confirm(?:\?.*)?$/, () =>
        toMockJsonResponse(createMessageResponse('Password reset confirmed'))
    ),
    http.post(/\/account\/logout-all(?:\?.*)?$/, () =>
        toMockJsonResponse(createMessageResponse('Logged out from all devices'))
    ),
    http.delete(/\/account\/tokens\/expired(?:\?.*)?$/, () =>
        toMockJsonResponse(createMessageResponse('Expired tokens removed'))
    )
];
