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
    mockOutbox,
    readRequestBody,
    readRequestParts,
    recordMockEmail,
    resetMockDatabase,
    resolveMockImageUrl,
    tryGetSessionStorage,
    trySetSessionStorage,
    asText
} from '@mocks/mockDb.ts';
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

// ── Tokens and passwords — the honest halves of the email flows ──────────────
//
// A token is valid because THIS mock issued it into the outbox, not because it fails to match a
// magic string: verify/reset handlers mint one, record the email that would have carried it, and
// the confirm handlers spend exactly what was minted — so a spec that skips reading the "email"
// cannot pass, the same way a person who never opens theirs cannot.
//
// Passwords work the same way: the map starts with the two demo accounts (the same pair
// `cy.loginAs` types), signup and the change/reset flows write into it, and login checks it — so
// "the old password stops working" is a provable claim. An email absent from the map accepts any
// password, which keeps incidental seed users loggable without cataloguing credentials here.
let mockTokenCounter = 0;
let issuedTokens = new Map<string, { type: 'verify' | 'reset'; email: string }>();

const buildKnownPasswords = () =>
    new Map<string, string>([
        ['gino@pino.it', 'password'],
        ['root@root.it', 'rootroot']
    ]);

let knownPasswords = buildKnownPasswords();

// ── The journal: this module's state, surviving the reloads its flows require ─
//
// The mock database is rebuilt from seeds on every full page load, which is fine for every flow
// that lives inside one page — and fatal for exactly the flows this module owns, because a
// confirm page is REACHED by a reload: the visitor arrives from the link in the email. So the
// state those flows cross the reload with — tokens, passwords, the users signup created, the
// fields the flows moved (an email change, a verified flag) — round-trips through sessionStorage
// the same way the session id does, and is folded back over the fresh seeds on demand.
//
// `applyAccountJournal()` runs at the top of every handler that reads users, tokens or
// passwords: rehydrating lazily per request rather than once at boot, because the seed rebuild
// itself happens after module init. The fold is idempotent.
const ACCOUNT_JOURNAL_KEY = 'mock_accountJournal';

let extraUsers: User[] = [];
let userPatches: Record<string, Partial<User>> = {};
let journalRestored = false;

const persistAccountJournal = () =>
    trySetSessionStorage(
        ACCOUNT_JOURNAL_KEY,
        JSON.stringify({
            tokens: [...issuedTokens],
            passwords: [...knownPasswords],
            extraUsers,
            userPatches
        })
    );

const applyAccountJournal = () => {
    if (!journalRestored) {
        journalRestored = true;
        const raw = tryGetSessionStorage(ACCOUNT_JOURNAL_KEY);
        if (raw)
            // eslint-disable-next-line no-restricted-syntax -- JSON.parse has no non-throwing form; a corrupt journal is discarded, not a crash
            try {
                const journal = JSON.parse(raw) as {
                    tokens: [string, { type: 'verify' | 'reset'; email: string }][];
                    passwords: [string, string][];
                    extraUsers: User[];
                    userPatches: Record<string, Partial<User>>;
                };
                issuedTokens = new Map(journal.tokens);
                knownPasswords = new Map(journal.passwords);
                extraUsers = journal.extraUsers;
                userPatches = journal.userPatches;
            } catch {
                // A malformed journal is a fresh start, not a crash.
            }
    }
    for (const extra of extraUsers)
        if (!mockDatabase.sampleUsers.some(({ id }) => id === extra.id))
            mockDatabase.sampleUsers.unshift(extra);
    for (const [id, patch] of Object.entries(userPatches)) {
        const patchedUser = mockDatabase.sampleUsers.find((user) => user.id === id);
        if (patchedUser) Object.assign(patchedUser, patch);
    }
};

/** Merge a patch for one user into the journal and the live database both. */
const patchUser = (id: string, patch: Partial<User>) => {
    userPatches[id] = { ...userPatches[id], ...patch };
    const patchedUser = mockDatabase.sampleUsers.find((user) => user.id === id);
    if (patchedUser) Object.assign(patchedUser, patch);
    persistAccountJournal();
};

const issueToken = (type: 'verify' | 'reset', email: string): string => {
    mockTokenCounter += 1;
    const token = `mock-${type}-token-${mockTokenCounter}`;
    issuedTokens.set(token, { type, email });
    persistAccountJournal();
    return token;
};

/** The claim behind a token, consumed — a link is spent by following it, both ways. */
const spendToken = (token: string | undefined, type: 'verify' | 'reset') => {
    const claim = token === undefined ? undefined : issuedTokens.get(token);
    if (claim?.type !== type) return undefined;
    issuedTokens.delete(String(token));
    persistAccountJournal();
    return claim;
};

const resetAccountSelfServiceState = () => {
    mockSessions = buildMockSessions();
    mockAddressBooks = new Map();
    issuedTokens = new Map();
    knownPasswords = buildKnownPasswords();
    extraUsers = [];
    userPatches = {};
    journalRestored = true; // the post-reset state is authoritative; nothing older applies
    trySetSessionStorage(ACCOUNT_JOURNAL_KEY, '');
};

/** The one-default invariant, exactly as the BE's repository keeps it. */
const normalizeDefaults = (book: Address[], claimantId?: string) => {
    if (book.length === 0) return;
    const claimant = claimantId && book.find(({ id }) => id === claimantId);
    if (claimant) for (const entry of book) entry.default = entry.id === claimantId;
    else if (!book.some(({ default: isDefault }) => isDefault)) book[0].default = true;
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

    // The outbox, read side: what the mock API "sent", newest first. Lives beside /__mock/reset
    // because this module owns the session the flows hang off; the records themselves come from
    // whichever handler sent them (signup, verify, reset — and the cart's order confirmation).
    http.get('/__mock/emails', () =>
        toMockJsonResponse(createSuccessEnvelope({ emails: mockOutbox }))
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
        applyAccountJournal();
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
    // Matches by email; the password is checked against `knownPasswords` when the account has an
    // entry there (the demo pair, anyone who signed up, anyone who reset), so a stale credential
    // fails here exactly like it would live. On success:
    //   1. Sets currentAuthenticatedUserId so GET /account returns this user.
    //   2. Mirrors the value to sessionStorage so it survives a cy.visit() reload.
    //   3. Returns mock tokens; the real token value doesn't matter to the client,
    //      it just stores it in the Pinia accessToken ref.
    // On failure returns 401 so the login-page error-handling flow can be tested.
    http.post(`${API_BASE}/account/login`, ({ request }) =>
        readRequestBody<LoginRequest>(request).then((requestBody) => {
            applyAccountJournal();
            const matchedUser = mockDatabase.sampleUsers.find(
                (user) => user.email.toLowerCase() === asText(requestBody.email).toLowerCase()
            );

            const expectedPassword =
                matchedUser && knownPasswords.get(matchedUser.email.toLowerCase());
            if (
                !matchedUser ||
                (expectedPassword !== undefined && expectedPassword !== requestBody.password)
            )
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
                    email: asText(requestBody.email, 'new.user@example.com'),
                    username: asText(requestBody.username, 'new-user'),
                    admin: false,
                    active: true,
                    // Self-signup starts unverified, exactly like the real API — the banner and
                    // the verify flow need a state to demonstrate.
                    verified: false,
                    imageUrl: resolveMockImageUrl(files),
                    createdAt: getIsoDateNow(),
                    updatedAt: getIsoDateNow()
                };

                applyAccountJournal();
                mockDatabase.sampleUsers.unshift(createdUser);
                // Into the journal too: the visitor who just signed up expects to still exist
                // after the reload the verification link brings them back through.
                extraUsers.push(createdUser);
                knownPasswords.set(createdUser.email.toLowerCase(), asText(requestBody.password));
                persistAccountJournal();
                // The verification email the real signup fires: the token lands in the outbox,
                // and the registration spec follows it exactly like a person following the link.
                recordMockEmail({
                    to: createdUser.email,
                    subject: 'Verify your email address',
                    template: 'account.verify-request.ejs',
                    token: issueToken('verify', createdUser.email)
                });
                return toMockJsonResponse(createSuccessEnvelope(createdUser), {
                    status: 201,
                    schema: SignupResponse
                });
            }
        )
    ),

    // ── Password reset (two-step flow) ────────────────────────────────────────
    //
    // Step 1 — POST /account/reset: a known email gets a token into the outbox; an unknown one
    // gets the same 200 and no email, mirroring the BE's enumeration-safe silence.
    //
    // Step 2 — POST /account/reset-confirm: spends a token step 1 issued and actually moves the
    // password, so "the old one stops working, the new one logs in" is a testable fact.
    http.post(`${API_BASE}/account/reset`, ({ request }) =>
        readRequestBody<{ email?: string }>(request).then((requestBody) => {
            applyAccountJournal();
            const email = asText(requestBody.email).toLowerCase();
            const matchedUser = mockDatabase.sampleUsers.find(
                (user) => user.email.toLowerCase() === email
            );
            if (matchedUser)
                recordMockEmail({
                    to: matchedUser.email,
                    subject: 'Reset your password',
                    template: 'account.reset-request.ejs',
                    token: issueToken('reset', matchedUser.email)
                });
            return toMockJsonResponse(createMessageResponse('Password reset email sent'), {
                schema: RequestPasswordResetResponse
            });
        })
    ),
    http.post(`${API_BASE}/account/reset-confirm`, ({ request }) =>
        readRequestBody<{ token?: string; password?: string }>(request).then((requestBody) => {
            applyAccountJournal();
            const claim = spendToken(requestBody.token, 'reset');
            if (!claim)
                return toMockJsonResponse(
                    createErrorEnvelope(422, 'VALIDATION_ERROR', 'Invalid or expired token'),
                    { status: 422, schema: MockErrorResponse }
                );
            knownPasswords.set(claim.email.toLowerCase(), asText(requestBody.password));
            persistAccountJournal();
            return toMockJsonResponse(createMessageResponse('Password reset confirmed'), {
                schema: ConfirmPasswordResetResponse
            });
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
            applyAccountJournal();
            const currentUser = getCurrentMockUser();
            if (!currentUser)
                return toMockJsonResponse(
                    createErrorEnvelope(401, 'UNAUTHORIZED', 'Not authenticated'),
                    { status: 401, schema: MockErrorResponse }
                );

            // Through the journal, not direct mutation: the verify flow this edit can start
            // (an email change unverifies) finishes on the other side of a reload.
            if (requestBody.email !== undefined && requestBody.email !== currentUser.email)
                patchUser(currentUser.id, { email: requestBody.email, verified: false });
            if (requestBody.username !== undefined)
                patchUser(currentUser.id, { username: requestBody.username });
            if (requestBody.locale !== undefined)
                patchUser(currentUser.id, { locale: requestBody.locale });
            if (requestBody.imageUrl !== undefined)
                patchUser(currentUser.id, { imageUrl: requestBody.imageUrl });
            patchUser(currentUser.id, { updatedAt: getIsoDateNow() });

            return toMockJsonResponse(createSuccessEnvelope(currentUser), {
                schema: UpdateAccountResponse
            });
        })
    ),

    // POST /account/password — the current password is checked against what the account really
    // has (see `knownPasswords`), and a successful change moves it, so the next login needs the
    // new one. An account with no entry accepts any current password, like login does.
    http.post(`${API_BASE}/account/password`, ({ request }) =>
        readRequestBody<{ currentPassword?: string; password?: string }>(request).then(
            (requestBody) => {
                applyAccountJournal();
                const currentUser = getCurrentMockUser();
                const email = currentUser?.email.toLowerCase();
                const expectedPassword =
                    email === undefined ? undefined : knownPasswords.get(email);
                if (
                    expectedPassword !== undefined &&
                    expectedPassword !== requestBody.currentPassword
                )
                    return toMockJsonResponse(
                        createErrorEnvelope(
                            422,
                            'VALIDATION_ERROR',
                            'The current password is incorrect.'
                        ),
                        { status: 422, schema: MockErrorResponse }
                    );
                if (email !== undefined) {
                    knownPasswords.set(email, asText(requestBody.password));
                    persistAccountJournal();
                }
                return toMockJsonResponse(createMessageResponse('Password changed'), {
                    schema: ChangePasswordResponse
                });
            }
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
        applyAccountJournal();
        const currentUser = getCurrentMockUser();
        if (currentUser?.verified)
            return toMockJsonResponse(createErrorEnvelope(409, 'CONFLICT', 'Already verified'), {
                status: 409,
                schema: MockErrorResponse
            });
        if (currentUser)
            recordMockEmail({
                to: currentUser.email,
                subject: 'Verify your email address',
                template: 'account.verify-request.ejs',
                token: issueToken('verify', currentUser.email)
            });
        return toMockJsonResponse(createMessageResponse('Verification email sent'), {
            schema: RequestEmailVerificationResponse
        });
    }),
    // Only a token this mock issued (signup or verify-request, via the outbox) verifies — and it
    // verifies the account it was issued TO, session or no session, exactly like the real link.
    http.post(`${API_BASE}/account/verify-confirm`, ({ request }) =>
        readRequestBody<{ token?: string }>(request).then((requestBody) => {
            applyAccountJournal();
            const claim = spendToken(requestBody.token, 'verify');
            if (!claim)
                return toMockJsonResponse(
                    createErrorEnvelope(422, 'VALIDATION_ERROR', 'Invalid or expired token'),
                    { status: 422, schema: MockErrorResponse }
                );
            const claimedUser = mockDatabase.sampleUsers.find(
                (user) => user.email.toLowerCase() === claim.email.toLowerCase()
            );
            if (claimedUser) patchUser(claimedUser.id, { verified: true });
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
                fullName: asText(requestBody.fullName),
                street: asText(requestBody.street),
                city: asText(requestBody.city),
                zip: asText(requestBody.zip),
                country: asText(requestBody.country),
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
