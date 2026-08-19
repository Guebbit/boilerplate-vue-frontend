import type { HttpHandler } from 'msw';
import type { User } from 'src/types';
import {
    ListUsersResponse,
    CreateUserResponse,
    UpdateUserResponse,
    DeleteUserResponse,
    SearchUsersResponse,
    GetUserByIdResponse,
    UpdateUserByIdResponse,
    DeleteUserByIdResponse,
    HardDeleteUserByIdResponse
} from '@api/schemas';
import {
    getIsoDateNow,
    mockDatabase,
    resolveMockImageUrl,
    toBooleanOrUndefined,
    asText,
    asOptionalText
} from '@mocks/mockDb.ts';
import { defineRestResource, type MockQuery } from '@mocks/rest-resource.ts';

/** The user list's filters, mirroring the BE's `buildWhere`: exact id, substring everything else. */
const matchesUserFilters = (user: User, query: MockQuery): boolean => {
    const text = asText(query.text).trim().toLowerCase();
    const id = asOptionalText(query.id);
    const email = asOptionalText(query.email)?.toLowerCase();
    const username = asOptionalText(query.username)?.toLowerCase();
    const active = toBooleanOrUndefined(query.active);

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
};

export const registerUsersMockHandlers = (): HttpHandler[] =>
    defineRestResource<User>({
        base: 'users',
        label: 'User',
        collection: () => mockDatabase.sampleUsers,
        schemas: {
            list: ListUsersResponse,
            search: SearchUsersResponse,
            create: CreateUserResponse,
            update: UpdateUserResponse,
            delete: DeleteUserResponse,
            get: GetUserByIdResponse,
            updateById: UpdateUserByIdResponse,
            deleteById: DeleteUserByIdResponse,
            hardDeleteById: HardDeleteUserByIdResponse
        },
        matches: matchesUserFilters,
        create: (fields, files) => ({
            id: `user-${Date.now()}`,
            email: asText(fields.email, 'created.user@example.com'),
            username: asText(fields.username, 'created-user'),
            admin: Boolean(fields.admin),
            active: fields.active === undefined ? true : Boolean(fields.active),
            imageUrl: resolveMockImageUrl(files),
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        }),
        update: (existing, fields, files, byId) => ({
            ...existing,
            email: asText(fields.email, existing.email),
            username: asText(fields.username, existing.username),
            // The by-id route leaves `active` alone — only the root PUT (the admin's bulk-shaped
            // edit) may toggle it, exactly as the BE splits the two.
            active: byId || fields.active === undefined ? existing.active : Boolean(fields.active),
            imageUrl: resolveMockImageUrl(files, existing.imageUrl),
            updatedAt: getIsoDateNow()
        }),
        // PUT /users with no id in the body edits the session's own account.
        defaultUpdateTargetId: () => mockDatabase.currentAuthenticatedUserId,
        // `undefined`, not an empty string: the BE tests for absence (`$exists: false`) — so
        // deleting twice restores the account.
        softDelete: (user) => ({
            ...user,
            deletedAt: user.deletedAt ? undefined : getIsoDateNow()
        })
    });
