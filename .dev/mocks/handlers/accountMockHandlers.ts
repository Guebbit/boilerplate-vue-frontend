import { http, type HttpHandler } from 'msw';
import type { LoginRequest, User } from '@/types';
import {
    createMessageResponse,
    defaultRefreshTokenResponse,
    getIsoDateNow,
    mockDatabase,
    readRequestBody,
    resetMockDatabase,
    trySetSessionStorage
} from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const registerAccountMockHandlers = (): HttpHandler[] => [
    // ── Dev / test utility ────────────────────────────────────────────────────
    //
    // Cypress calls cy.resetMockState() (defined in cypress/support/commands.ts)
    // between tests to wipe the in-memory database back to its initial fixtures.
    // That command hits this endpoint via cy.request('POST', '/__mock/reset').
    // resetMockDatabase() also clears the sessionStorage mirror of the current
    // user ID so that the next test starts as a fresh, unauthenticated visitor.
    http.post('/__mock/reset', () => {
        resetMockDatabase();
        return toMockJsonResponse(createMessageResponse('Mock state reset'));
    }),

    // ── Token refresh ─────────────────────────────────────────────────────────
    //
    // The real API issues short-lived access tokens. On a page reload the
    // Pinia store loses its in-memory accessToken and calls GET /account/refresh
    // with the refresh-token cookie to obtain a new one.
    //
    // In the mock we always succeed — any caller gets back the same static
    // tokens. This is intentional: tests care about UI behaviour after a
    // successful token refresh, not about refresh-token validation itself.
    //
    // Two routes cover both the legacy /:token path param form and the cookie-
    // only form used by the current client.
    http.get(`${API_BASE}/account/refresh/:token`, () =>
        toMockJsonResponse(defaultRefreshTokenResponse)
    ),
    http.get(`${API_BASE}/account/refresh`, () => toMockJsonResponse(defaultRefreshTokenResponse)),

    // ── Current authenticated user ────────────────────────────────────────────
    //
    // Returns the profile for whoever is currently "logged in" in the mock
    // database. mockDatabase.currentAuthenticatedUserId is updated by the login
    // and signup handlers below and is mirrored in sessionStorage so that a
    // cy.visit() page reload (which re-evaluates this module) still returns the
    // right user rather than silently reverting to user-1 (admin).
    http.get(`${API_BASE}/account`, () => {
        const currentUser =
            mockDatabase.sampleUsers.find((user) => user.id === mockDatabase.currentAuthenticatedUserId) ??
            mockDatabase.sampleUsers[0];
        return toMockJsonResponse(currentUser);
    }),

    // ── Login ─────────────────────────────────────────────────────────────────
    //
    // Matches by email only — no password check needed in tests. On success:
    //   1. Sets currentAuthenticatedUserId so GET /account returns this user.
    //   2. Mirrors the value to sessionStorage so it survives a cy.visit() reload.
    //   3. Returns mock tokens; the real token value doesn't matter to the client,
    //      it just stores it in the Pinia accessToken ref.
    // On failure returns 401 so the login-page error-handling flow can be tested.
    http.post(`${API_BASE}/account/login`, async ({ request }) => {
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
        trySetSessionStorage('mock_currentUserId', matchedUser.id);
        return toMockJsonResponse({
            token: `mock-token-for-${matchedUser.id}`,
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600
        });
    }),

    // ── Signup ────────────────────────────────────────────────────────────────
    //
    // Creates a new user from the request body, pushes it into the in-memory
    // users array, and immediately marks it as the current authenticated user
    // (mirrored to sessionStorage for the same reload-survival reason as login).
    // Returns 201 with the new user object so the client can populate its store.
    http.post(`${API_BASE}/account/signup`, async ({ request }) => {
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
        trySetSessionStorage('mock_currentUserId', createdUser.id);
        return toMockJsonResponse(createdUser, { status: 201 });
    }),

    // ── Password reset (two-step flow) ────────────────────────────────────────
    //
    // Step 1 — POST /account/reset: user submits their email; real API sends a
    // reset link. Mock just acknowledges success so the UI confirmation screen
    // can be tested without sending actual email.
    //
    // Step 2 — POST /account/reset-confirm: user submits the new password
    // together with the token from the email link. Mock always succeeds so the
    // redirect-to-login flow can be tested.
    http.post(`${API_BASE}/account/reset`, () =>
        toMockJsonResponse(createMessageResponse('Password reset email sent'))
    ),
    http.post(`${API_BASE}/account/reset-confirm`, () =>
        toMockJsonResponse(createMessageResponse('Password reset confirmed'))
    ),

    // ── Session management ────────────────────────────────────────────────────
    //
    // logout-all — invalidates every active session on the real API (useful
    // after a suspected account compromise). Mock just acknowledges.
    //
    // DELETE /account/tokens/expired — admin maintenance endpoint that purges
    // expired refresh tokens from the database. Mock always succeeds.
    http.post(`${API_BASE}/account/logout-all`, () =>
        toMockJsonResponse(createMessageResponse('Logged out from all devices'))
    ),
    http.delete(`${API_BASE}/account/tokens/expired`, () =>
        toMockJsonResponse(createMessageResponse('Expired tokens removed'))
    )
];
