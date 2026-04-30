import { http, type HttpHandler } from 'msw';
import type { User, UsersResponse } from '@/types';
import {
    createMessageResponse,
    getIsoDateNow,
    getQueryParameters,
    mockDatabase,
    readRequestBody,
    slicePaginatedData,
    toBooleanOrUndefined,
    toNumberOrDefault,
    toPaginationMeta
} from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const replyUsersList = (url: string | undefined, parameters?: unknown) => {
    const query = getQueryParameters(url, parameters);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const text = String(query.text ?? '')
        .trim()
        .toLowerCase();
    const id = query.id ? String(query.id) : undefined;
    const email = query.email ? String(query.email).toLowerCase() : undefined;
    const username = query.username ? String(query.username).toLowerCase() : undefined;
    const active = toBooleanOrUndefined(query.active);

    const filteredItems = mockDatabase.sampleUsers.filter((user) => {
        if (id && user.id !== id) return false;
        if (email && !user.email.toLowerCase().includes(email)) return false;
        if (username && !user.username.toLowerCase().includes(username)) return false;
        if (typeof active === 'boolean' && user.active !== active) return false;
        if (
            text &&
            !user.email.toLowerCase().includes(text) &&
            !user.username.toLowerCase().includes(text) &&
            !user.id.toLowerCase().includes(text)
        )
            return false;
        return true;
    });

    return toMockJsonResponse<UsersResponse>({
        items: slicePaginatedData(filteredItems, page, pageSize),
        meta: toPaginationMeta(filteredItems.length, page, pageSize)
    });
};

export const registerUsersMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/users`, ({ request }) => replyUsersList(request.url)),
    http.post(`${API_BASE}/users`, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const createdUser: User = {
            id: `user-${Date.now()}`,
            email: String(requestBody.email ?? 'created.user@example.com'),
            username: String(requestBody.username ?? 'created-user'),
            admin: Boolean(requestBody.admin),
            active: requestBody.active === undefined ? true : Boolean(requestBody.active),
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        };

        mockDatabase.sampleUsers.unshift(createdUser);
        return toMockJsonResponse(createdUser, { status: 201 });
    }),
    http.put(`${API_BASE}/users`, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const targetId = String(requestBody.id ?? mockDatabase.currentAuthenticatedUserId);
        const targetIndex = mockDatabase.sampleUsers.findIndex(({ id }) => id === targetId);

        if (targetIndex === -1)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );

        const updatedUser: User = {
            ...mockDatabase.sampleUsers[targetIndex],
            email: requestBody.email
                ? String(requestBody.email)
                : mockDatabase.sampleUsers[targetIndex].email,
            username: requestBody.username
                ? String(requestBody.username)
                : mockDatabase.sampleUsers[targetIndex].username,
            active:
                requestBody.active === undefined
                    ? mockDatabase.sampleUsers[targetIndex].active
                    : Boolean(requestBody.active),
            updatedAt: getIsoDateNow()
        };

        mockDatabase.sampleUsers[targetIndex] = updatedUser;
        return toMockJsonResponse(updatedUser);
    }),
    http.delete(`${API_BASE}/users`, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleUsers.findIndex(({ id }) => id === targetId);

        if (targetIndex === -1)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );

        mockDatabase.sampleUsers.splice(targetIndex, 1);
        return toMockJsonResponse(createMessageResponse('User deleted'));
    }),
    http.post(`${API_BASE}/users/search`, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        return replyUsersList(request.url, requestBody);
    }),
    http.get(`${API_BASE}/users/:userId`, ({ params }) => {
        const userId = String(params.userId);
        const targetUser = mockDatabase.sampleUsers.find((user) => user.id === userId);

        if (!targetUser)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );

        return toMockJsonResponse(targetUser);
    }),
    http.put(`${API_BASE}/users/:userId`, async ({ request, params }) => {
        const userId = String(params.userId);
        const targetIndex = mockDatabase.sampleUsers.findIndex(({ id }) => id === userId);

        if (targetIndex === -1)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );

        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const updatedUser: User = {
            ...mockDatabase.sampleUsers[targetIndex],
            email: requestBody.email
                ? String(requestBody.email)
                : mockDatabase.sampleUsers[targetIndex].email,
            username: requestBody.username
                ? String(requestBody.username)
                : mockDatabase.sampleUsers[targetIndex].username,
            updatedAt: getIsoDateNow()
        };

        mockDatabase.sampleUsers[targetIndex] = updatedUser;
        return toMockJsonResponse(updatedUser);
    }),
    http.delete(`${API_BASE}/users/:userId`, ({ params }) => {
        const userId = String(params.userId);
        const targetIndex = mockDatabase.sampleUsers.findIndex(({ id }) => id === userId);

        if (targetIndex === -1)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );

        mockDatabase.sampleUsers.splice(targetIndex, 1);
        return toMockJsonResponse(createMessageResponse('User deleted'));
    })
];
