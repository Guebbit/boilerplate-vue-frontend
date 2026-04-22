import type MockAdapter from 'axios-mock-adapter';
import type { User, UsersResponse } from '@/types';
import {
    createMessageResponse,
    getIsoDateNow,
    getLastPathSegment,
    getQueryParameters,
    mockDatabase,
    parseRequestBody,
    slicePaginatedData,
    toBooleanOrUndefined,
    toNumberOrDefault,
    toPaginationMeta
} from '../shared/mockShared.ts';
import { toMockReply } from '../shared/mockTransport.ts';

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

    return toMockReply<UsersResponse>({
        items: slicePaginatedData(filteredItems, page, pageSize),
        meta: toPaginationMeta(filteredItems.length, page, pageSize)
    });
};

export const registerUsersMockHandlers = (mockAdapter: MockAdapter) => {
    mockAdapter
        .onGet(/\/users(?:\?.*)?$/)
        .reply((config) => replyUsersList(config.url, config.params));

    mockAdapter.onPost(/\/users(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
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
        return toMockReply(createdUser, { status: 201 });
    });

    mockAdapter.onPut(/\/users(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? mockDatabase.currentAuthenticatedUserId);
        const targetIndex = mockDatabase.sampleUsers.findIndex(({ id }) => id === targetId);
        if (targetIndex === -1)
            return toMockReply(
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
        return toMockReply(updatedUser);
    });

    mockAdapter.onDelete(/\/users(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleUsers.findIndex(({ id }) => id === targetId);
        if (targetIndex === -1)
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );
        mockDatabase.sampleUsers.splice(targetIndex, 1);
        return toMockReply(createMessageResponse('User deleted'));
    });

    mockAdapter.onPost(/\/users\/search(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        return replyUsersList(config.url, requestBody);
    });

    mockAdapter.onGet(/\/users\/[^/]+(?:\?.*)?$/).reply((config) => {
        const userId = getLastPathSegment(config.url);
        const targetUser = mockDatabase.sampleUsers.find((user) => user.id === userId);
        if (!targetUser)
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );
        return toMockReply(targetUser);
    });

    mockAdapter.onPut(/\/users\/[^/]+(?:\?.*)?$/).reply((config) => {
        const userId = getLastPathSegment(config.url);
        const targetIndex = mockDatabase.sampleUsers.findIndex(({ id }) => id === userId);
        if (targetIndex === -1)
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
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
        return toMockReply(updatedUser);
    });

    mockAdapter.onDelete(/\/users\/[^/]+(?:\?.*)?$/).reply((config) => {
        const userId = getLastPathSegment(config.url);
        const targetIndex = mockDatabase.sampleUsers.findIndex(({ id }) => id === userId);
        if (targetIndex === -1)
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
                { status: 404 }
            );
        mockDatabase.sampleUsers.splice(targetIndex, 1);
        return toMockReply(createMessageResponse('User deleted'));
    });
};
