import { http, type HttpHandler } from 'msw';
import type { LoginRequest, User } from 'src/types';
import {
    GetAccountResponse,
    LoginResponse,
    SignupResponse,
    RefreshTokenResponse as RefreshTokenResponseSchema,
    RequestPasswordResetResponse,
    ConfirmPasswordResetResponse,
    LogoutResponse,
    LogoutAllResponse,
    DeleteExpiredTokensResponse,
    UpdateAccountResponse,
    ChangePasswordResponse,
    GetSessionsResponse,
    RevokeSessionResponse,
    RequestEmailVerificationResponse,
    ConfirmEmailVerificationResponse,
    GetAddressesResponse,
    AddAddressResponse,
    UpdateAddressResponse,
    RemoveAddressResponse
} from '@api/schemas';
import type { Address, AddressInput, Session, UpdateAccountRequest } from 'src/types';
import {
    createErrorEnvelope,
    getCurrentMockUser,
    createMessageResponse,
    createSuccessEnvelope,
    defaultRefreshTokenResponse,
    getIsoDateNow,
    mockDatabase,
    readRequestBody,
    readRequestParts,
    resetMockDatabase,
    resolveMockImageUrl,
    trySetSessionStorage
} from '@mocks/mockShared.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ── Self-service state the seed identities do not carry ──────────────────────
//
// Sessions and address books are this module's own runtime state: the BE seeds neither (a
// session exists because someone logged in, an address because someone typed one), so the mock
// keeps them in module scope and resets them alongside the database. The current session id is
// stable so the `current` chip has something to point at; the phone entry exists so the revoke
// flow has a victim that is not the caller's own session.
const CURRENT_SESSION_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const OTHER_SESSION_ID = 'aaaaaaaaaaaaaaaaaaaaaaa2';

const buildMockSessions = (): Session[] => [
    {
        id: CURRENT_SESSION_ID,
        current: true,
        expiration: new Date(Date.now() + 3_600_000).toISOString()
    },
    {
        id: OTHER_SESSION_ID,
        current: false,
        expiration: new Date(Date.now() + 86_400_000).toISOString()
    }
];

let mockSessions: Session[] = buildMockSessions();

/** Address books per user id. Starts empty like the BE's — nobody is born with addresses. */
let mockAddressBooks = new Map<string, Address[]>();

const resetAccountSelfServiceState = () => {
    mockSessions = buildMockSessions();
    mockAddressBooks = new Map();
};

/** The one-default invariant, exactly as the BE's repository keeps it. */
const normalizeDefaults = (book: Address[], claimantId?: string) => {
    if (book.length === 0) return;
    const claimant = claimantId && book.find(({ id }) => id === claimantId);
    if (claimant) for (const entry of book) entry.default = entry.id === claimantId;
    else if (!book.some(({ default: isDefault }) => isDefault)) book[0]!.default = true;
};

let addressIdCounter = 0;

export const registerAccountMockHandlers = (): HttpHandler[] => [
    // ── Dev / test utility ────────────────────────────────────────────────────
    //
    // Cypress calls cy.resetMockState() (defined in tests/support/e2e/commands.ts)
    // between tests to wipe the in-memory database back to its initial fixtures.
    // That command hits this endpoint via cy.request('POST', '/__mock/reset').
    // resetMockDatabase() also clears the sessionStorage mirror of the current
    // user ID so that the next test starts as a fresh, unauthenticated visitor.
    http.post('/__mock/reset', () =>
        resetMockDatabase().then(() => {
            resetAccountSelfServiceState();
            return toMockJsonResponse(createMessageResponse('Mock state reset'));
        })
    ),

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
    // Cookie-only, like the real API: the `/account/refresh/:token` path form was
    // dropped from the contract because a refresh token in a URL leaks into history,
    // proxy logs and Referer headers.
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
    http.post(`${API_BASE}/account/login`, ({ request }) =>
        readRequestBody<LoginRequest>(request).then((requestBody) => {
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
        })
    ),

    // ── Signup ────────────────────────────────────────────────────────────────
    //
    // Creates a new user from the request body and pushes it into the in-memory
    // users array. Per openapi.yaml, signup returns the created User (UserEnvelope),
    // not a token, and does NOT start a session — the client is expected to log in
    // separately (after confirming the account) to obtain an access token. So,
    // unlike login, this does not touch currentAuthenticatedUserId/sessionStorage.
    http.post(`${API_BASE}/account/signup`, ({ request }) =>
        readRequestParts<Record<string, unknown>>(request).then(
            ({ fields: requestBody, files }) => {
                const createdUser: User = {
                    id: `user-${Date.now()}`,
                    email: String(requestBody.email ?? 'new.user@example.com'),
                    username: String(requestBody.username ?? 'new-user'),
                    admin: false,
                    active: true,
                    // Self-signup starts unverified, exactly like the real API — the banner and
                    // the verify flow need a state to demonstrate.
                    verified: false,
                    imageUrl: resolveMockImageUrl(files),
                    createdAt: getIsoDateNow(),
                    updatedAt: getIsoDateNow()
                };

                mockDatabase.sampleUsers.unshift(createdUser);
                return toMockJsonResponse(createSuccessEnvelope(createdUser), {
                    status: 201,
                    schema: SignupResponse
                });
            }
        )
    ),

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
    ),

    // ── Self-service profile ──────────────────────────────────────────────────
    //
    // PUT /account edits whoever is logged in. An email change unverifies the account, exactly
    // like the real API — the profile banner appears from the response alone.
    http.put(`${API_BASE}/account`, ({ request }) =>
        readRequestBody<UpdateAccountRequest>(request).then((requestBody) => {
            const currentUser = getCurrentMockUser();
            if (!currentUser)
                return toMockJsonResponse(
                    createErrorEnvelope(401, 'UNAUTHORIZED', 'Not authenticated'),
                    { status: 401, schema: MockErrorResponse }
                );

            if (requestBody.email !== undefined && requestBody.email !== currentUser.email) {
                currentUser.email = requestBody.email;
                currentUser.verified = false;
            }
            if (requestBody.username !== undefined) currentUser.username = requestBody.username;
            if (requestBody.imageUrl !== undefined) currentUser.imageUrl = requestBody.imageUrl;
            currentUser.updatedAt = getIsoDateNow();

            return toMockJsonResponse(createSuccessEnvelope(currentUser), {
                schema: UpdateAccountResponse
            });
        })
    ),

    // POST /account/password — `wrong-password` is the mock's agreed wrong current password, so
    // the failure toast can be exercised end to end.
    http.post(`${API_BASE}/account/password`, ({ request }) =>
        readRequestBody<{ currentPassword?: string }>(request).then((requestBody) =>
            requestBody.currentPassword === 'wrong-password'
                ? toMockJsonResponse(
                      createErrorEnvelope(
                          422,
                          'VALIDATION_ERROR',
                          'The current password is incorrect.'
                      ),
                      { status: 422, schema: MockErrorResponse }
                  )
                : toMockJsonResponse(createMessageResponse('Password changed'), {
                      schema: ChangePasswordResponse
                  })
        )
    ),

    // POST /account/logout — this session only. Same local effect as logout-all in a mock that
    // has exactly one browser, but the sessions list keeps the other device.
    http.post(`${API_BASE}/account/logout`, () => {
        mockDatabase.currentAuthenticatedUserId = undefined;
        trySetSessionStorage('mock_currentUserId', ''); // '' = "no session" sentinel
        mockSessions = mockSessions.filter(({ id }) => id !== CURRENT_SESSION_ID);
        return toMockJsonResponse(createMessageResponse('Logged out'), {
            schema: LogoutResponse
        });
    }),

    // ── Sessions ─────────────────────────────────────────────────────────────
    http.get(`${API_BASE}/account/sessions`, () =>
        toMockJsonResponse(createSuccessEnvelope({ sessions: mockSessions }), {
            schema: GetSessionsResponse
        })
    ),
    http.delete(`${API_BASE}/account/sessions/:sessionId`, ({ params }) => {
        const sessionId = String(params.sessionId);
        if (!mockSessions.some(({ id }) => id === sessionId))
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Session not found'), {
                status: 404,
                schema: MockErrorResponse
            });
        mockSessions = mockSessions.filter(({ id }) => id !== sessionId);
        return toMockJsonResponse(createMessageResponse('Session revoked'), {
            schema: RevokeSessionResponse
        });
    }),

    // ── Email verification ───────────────────────────────────────────────────
    http.post(`${API_BASE}/account/verify-request`, () => {
        const currentUser = getCurrentMockUser();
        if (currentUser?.verified)
            return toMockJsonResponse(createErrorEnvelope(409, 'CONFLICT', 'Already verified'), {
                status: 409,
                schema: MockErrorResponse
            });
        return toMockJsonResponse(createMessageResponse('Verification email sent'), {
            schema: RequestEmailVerificationResponse
        });
    }),
    // `invalid-token` is the agreed bad token; anything else verifies whoever is signed in —
    // matching the real flow closely enough for the confirm page and the banner to be tested.
    http.post(`${API_BASE}/account/verify-confirm`, ({ request }) =>
        readRequestBody<{ token?: string }>(request).then((requestBody) => {
            if (!requestBody.token || requestBody.token === 'invalid-token')
                return toMockJsonResponse(
                    createErrorEnvelope(422, 'VALIDATION_ERROR', 'Invalid or expired token'),
                    { status: 422, schema: MockErrorResponse }
                );
            const currentUser = getCurrentMockUser();
            if (currentUser) currentUser.verified = true;
            return toMockJsonResponse(createMessageResponse('Email address verified'), {
                schema: ConfirmEmailVerificationResponse
            });
        })
    ),

    // ── Address book ─────────────────────────────────────────────────────────
    //
    // The one-default invariant lives in `normalizeDefaults`, mirroring the BE repository: the
    // first entry claims the slot, `default: true` steals it, deleting the holder promotes the
    // oldest survivor.
    http.get(`${API_BASE}/account/addresses`, () => {
        const currentUser = getCurrentMockUser();
        const book = (currentUser && mockAddressBooks.get(currentUser.id)) ?? [];
        return toMockJsonResponse(createSuccessEnvelope({ addresses: book }), {
            schema: GetAddressesResponse
        });
    }),
    http.post(`${API_BASE}/account/addresses`, ({ request }) =>
        readRequestBody<AddressInput>(request).then((requestBody) => {
            const currentUser = getCurrentMockUser();
            if (!currentUser)
                return toMockJsonResponse(
                    createErrorEnvelope(401, 'UNAUTHORIZED', 'Not authenticated'),
                    { status: 401, schema: MockErrorResponse }
                );
            const book = mockAddressBooks.get(currentUser.id) ?? [];
            addressIdCounter += 1;
            const entry: Address = {
                id: `address-${addressIdCounter}`,
                label: requestBody.label,
                fullName: String(requestBody.fullName ?? ''),
                street: String(requestBody.street ?? ''),
                city: String(requestBody.city ?? ''),
                zip: String(requestBody.zip ?? ''),
                country: String(requestBody.country ?? ''),
                phone: requestBody.phone,
                default: book.length === 0 || requestBody.default === true
            };
            book.push(entry);
            normalizeDefaults(book, entry.default ? entry.id : undefined);
            mockAddressBooks.set(currentUser.id, book);
            return toMockJsonResponse(createSuccessEnvelope({ addresses: book }), {
                schema: AddAddressResponse
            });
        })
    ),
    http.put(`${API_BASE}/account/addresses/:addressId`, ({ request, params }) =>
        readRequestBody<Partial<AddressInput>>(request).then((requestBody) => {
            const currentUser = getCurrentMockUser();
            const book = (currentUser && mockAddressBooks.get(currentUser.id)) ?? [];
            const entry = book.find(({ id }) => id === String(params.addressId));
            if (!entry)
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Address not found'),
                    { status: 404, schema: MockErrorResponse }
                );
            if (requestBody.label !== undefined) entry.label = requestBody.label;
            if (requestBody.fullName !== undefined) entry.fullName = requestBody.fullName;
            if (requestBody.street !== undefined) entry.street = requestBody.street;
            if (requestBody.city !== undefined) entry.city = requestBody.city;
            if (requestBody.zip !== undefined) entry.zip = requestBody.zip;
            if (requestBody.country !== undefined) entry.country = requestBody.country;
            if (requestBody.phone !== undefined) entry.phone = requestBody.phone;
            if (requestBody.default === true) normalizeDefaults(book, entry.id);
            return toMockJsonResponse(createSuccessEnvelope({ addresses: book }), {
                schema: UpdateAddressResponse
            });
        })
    ),
    http.delete(`${API_BASE}/account/addresses/:addressId`, ({ params }) => {
        const currentUser = getCurrentMockUser();
        const book = (currentUser && mockAddressBooks.get(currentUser.id)) ?? [];
        const entry = book.find(({ id }) => id === String(params.addressId));
        if (!currentUser || !entry)
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Address not found'), {
                status: 404,
                schema: MockErrorResponse
            });
        const remaining = book.filter(({ id }) => id !== entry.id);
        normalizeDefaults(remaining);
        mockAddressBooks.set(currentUser.id, remaining);
        return toMockJsonResponse(createSuccessEnvelope({ addresses: remaining }), {
            schema: RemoveAddressResponse
        });
    })
];
