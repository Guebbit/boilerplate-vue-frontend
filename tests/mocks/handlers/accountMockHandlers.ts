import { http, type HttpHandler } from 'msw';
import type { LoginRequest, User } from 'src/types';
import {
    GetAccountResponse,
    LoginResponse,
    SignupResponse,
    RefreshTokenResponse as RefreshTokenResponseSchema,
    RefreshTokenWithPathResponse,
    RequestPasswordResetResponse,
    ConfirmPasswordResetResponse,
    LogoutAllResponse,
    DeleteExpiredTokensResponse
} from '@api/schemas';
import {
    createErrorEnvelope,
    createMessageResponse,
    createSuccessEnvelope,
    defaultRefreshTokenResponse,
    getIsoDateNow,
    mockDatabase,
    readRequestBody,
    resetMockDatabase,
    trySetSessionStorage
} from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';
import { MockErrorResponse } from '../shared/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const registerAccountMockHandlers = (): HttpHandler[] => [
    // ── Dev / test utility ────────────────────────────────────────────────────
    //
    // Cypress calls cy.resetMockState() (defined in tests/e2e/support/commands.ts)
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
    // to obtain a new one.
    //
    // In the mock, refresh succeeds only when there is an active session
    // (currentAuthenticatedUserId is set). This lets the default dev state
    // (admin) auto-authenticate on page load, while a reset/logout produces a
    // proper 401 so that guest-only pages remain accessible.
    //
    // Two routes cover both the legacy /:token path param form and the cookie-
    // only form used by the current client.
    http.get(`${API_BASE}/account/refresh/:token`, () =>
        mockDatabase.currentAuthenticatedUserId
            ? toMockJsonResponse(createSuccessEnvelope(defaultRefreshTokenResponse), {
                  schema: RefreshTokenWithPathResponse
              })
            : toMockJsonResponse(createErrorEnvelope(401, 'UNAUTHORIZED', 'Not authenticated'), {
                  status: 401,
                  schema: MockErrorResponse
              })
    ),
    http.get(`${API_BASE}/account/refresh`, () =>
        mockDatabase.currentAuthenticatedUserId
            ? toMockJsonResponse(createSuccessEnvelope(defaultRefreshTokenResponse), {
                  schema: RefreshTokenResponseSchema
              })
            : toMockJsonResponse(createErrorEnvelope(401, 'UNAUTHORIZED', 'Not authenticated'), {
                  status: 401,
                  schema: MockErrorResponse
              })
    ),

    // ── Current authenticated user ────────────────────────────────────────────
    //
    // Returns the profile for whoever is currently "logged in" in the mock
    // database. Returns 401 when no session exists so that unauthenticated
    // visitors don't accidentally appear as logged-in users.
    // mockDatabase.currentAuthenticatedUserId is updated by the login and signup
    // handlers below and is mirrored in sessionStorage so that a cy.visit() page
    // reload still returns the right user rather than losing the session.
    http.get(`${API_BASE}/account`, ({ request }) => {
        if (!request.headers.get('Authorization'))
            return toMockJsonResponse(
                createErrorEnvelope(401, 'UNAUTHORIZED', 'Not authenticated'),
                {
                    status: 401,
                    schema: MockErrorResponse
                }
            );
        const currentUser = mockDatabase.sampleUsers.find(
            (user) => user.id === mockDatabase.currentAuthenticatedUserId
        );
        if (!currentUser)
            return toMockJsonResponse(
                createErrorEnvelope(401, 'UNAUTHORIZED', 'Not authenticated'),
                {
                    status: 401,
                    schema: MockErrorResponse
                }
            );
        return toMockJsonResponse(createSuccessEnvelope(currentUser), {
            schema: GetAccountResponse
        });
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
                createErrorEnvelope(401, 'UNAUTHORIZED', 'Invalid credentials'),
                { status: 401, schema: MockErrorResponse }
            );

        mockDatabase.currentAuthenticatedUserId = matchedUser.id;
        trySetSessionStorage('mock_currentUserId', matchedUser.id);
        return toMockJsonResponse(
            createSuccessEnvelope({
                token: `mock-token-for-${matchedUser.id}`,
                refreshToken: 'mock-refresh-token',
                expiresIn: 3600
            }),
            { schema: LoginResponse }
        );
    }),

    // ── Signup ────────────────────────────────────────────────────────────────
    //
    // Creates a new user from the request body and pushes it into the in-memory
    // users array. Per openapi.yaml, signup returns the created User (UserEnvelope),
    // not a token, and does NOT start a session — the client is expected to log in
    // separately (after confirming the account) to obtain an access token. So,
    // unlike login, this does not touch currentAuthenticatedUserId/sessionStorage.
    http.post(`${API_BASE}/account/signup`, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const createdUser: User = {
            id: `user-${Date.now()}`,
            email: String(requestBody.email ?? 'new.user@example.com'),
            username: String(requestBody.username ?? 'new-user'),
            admin: false,
            active: true,
            imageUrl: undefined,
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        };

        mockDatabase.sampleUsers.unshift(createdUser);
        return toMockJsonResponse(createSuccessEnvelope(createdUser), {
            status: 201,
            schema: SignupResponse
        });
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
        toMockJsonResponse(createMessageResponse('Password reset email sent'), {
            schema: RequestPasswordResetResponse
        })
    ),
    http.post(`${API_BASE}/account/reset-confirm`, () =>
        toMockJsonResponse(createMessageResponse('Password reset confirmed'), {
            schema: ConfirmPasswordResetResponse
        })
    ),

    // ── Session management ────────────────────────────────────────────────────
    //
    // logout-all — invalidates every active session on the real API (useful
    // after a suspected account compromise). In the mock, also clears the
    // in-memory session so that subsequent refresh / profile calls return 401
    // and the app correctly shows guest-only content after logout.
    //
    // DELETE /account/tokens/expired — admin maintenance endpoint that purges
    // expired refresh tokens from the database. Mock always succeeds.
    http.post(`${API_BASE}/account/logout-all`, () => {
        mockDatabase.currentAuthenticatedUserId = undefined;
        trySetSessionStorage('mock_currentUserId', ''); // '' = "no session" sentinel
        return toMockJsonResponse(createMessageResponse('Logged out from all devices'), {
            schema: LogoutAllResponse
        });
    }),
    http.delete(`${API_BASE}/account/tokens/expired`, () =>
        toMockJsonResponse(createMessageResponse('Expired tokens removed'), {
            schema: DeleteExpiredTokensResponse
        })
    )
];
