# FE-3 — Frozen expectations (blind, from Tier A spec only)

Tier A sources read: `openapi.yaml` (root, this repo — verified byte-identical to
`boilerplate-node-backend-2`), `account` paths (lines 675-1139) and the shared
schemas they reference (`User`/`UserEnvelope` :3240-3296, `Session`/`SessionsResponse`/
`SessionsEnvelope` :4465-4511, `AuthTokens`/`AuthTokensEnvelope` :4662-4693,
`LoginRequest` :4644-4661, `RefreshTokenResponse`/`RefreshTokenEnvelope` :4759-4790,
`securitySchemes.bearerAuth` :2957-2961, generic responses `Success`/`Unauthorized`/
`Forbidden`/`NotFound`/`Conflict`/`ValidationError` :3050-3091). The account module's
own `openapi.yaml` fragment in `boilerplate-node-backend-2` was NOT opened separately —
the root bundle carried enough prose for every question below.

Tier B sources read: `docs/modules/account.md` "Screens" table (lines 76-89), plus the
"Screens" tables of `docs/modules/admin.md` and `docs/modules/users.md` only to see the
full vocabulary of `meta.access` values used elsewhere in the app (`guest`/`public`/
`auth`/`admin`) — no endpoint or field content was taken from admin.md/users.md, only
the access-level vocabulary.

No test or implementation file has been opened yet. `src/` has not been opened, except
for the two `docs/modules/*.md` files above, which are documentation, not source.

## E1 — Four route-access levels exist, by name, per Tier B
`docs/modules/account.md:78-87` assigns each account screen one of: `guest` (Login,
Signup, PasswordResetRequest, PasswordResetConfirm), `public` (AccountDeleteConfirm,
VerifyEmailConfirm, Logout), `auth` (Profile). `docs/modules/admin.md:5`/`users.md:5`
additionally show `admin`. This is Tier B (co-authored prose) — a guard test that
contradicts only this table is MISMATCH-SPEC, not MISMATCH-CODE, unless the root
contract also states the rule (see E2-E4 for where it does).

## E2 — `guest` routes require security: [] AND must reject an authenticated caller only per Tier B, not per Tier A
`openapi.yaml` shows `security: []` (no auth required) on `login` (:1005),
`signup` (:1032), `reset` (:1062), `reset-confirm` (:1083) — consistent with a logged-out
visitor reaching them. The root contract is silent on whether an ALREADY-authenticated
caller is forbidden from calling these endpoints (no 403 "already logged in" response
is documented on any of them — only 401/422/500 style responses appear). So: "logged-out
user may reach guest routes" is Tier A + Tier B (E1); "already-logged-in user is bounced
away from guest routes" is Tier B only (docs table) — a guard enforcing that redirect is
SPEC-SILENT/MISMATCH-SPEC-worthy per Tier A alone, not a code bug.

## E3 — `auth`-access endpoints require only a valid bearer token, not `verified: true`
Every account endpoint that requires auth (`GET/PUT/DELETE /account` :683,700,732;
`POST /account/password` :748; `GET /account/sessions` :785; `DELETE /account/sessions/
{id}` :805; `GET/POST /account/addresses` :832,851; `PUT/DELETE /account/addresses/{id}`
:879,915; `POST /account/verify-request` :946; `POST /account/logout-all` :1124) lists
only `security: [bearerAuth: []]` and a `401 Unauthorized` failure mode. None declares a
403/"forbidden" response tied to the `User.verified` boolean (:3275-3276). Per Tier A,
an authenticated-but-unverified user has IDENTICAL route/API access to a verified one —
verification only gates the semantic effect of `/account/verify-confirm` itself. A guard
that blocks or redirects an unverified-but-authenticated user away from `auth`-access
routes (e.g. `Profile`) has no Tier A basis — that would be MISMATCH-SPEC at best (no
Tier A or Tier B source states such a gate at all) and S1 if it also lets an unverified
user reach something a verified one shouldn't, or vice versa, since none is documented.

## E4 — `admin`-only endpoints require a 403 path distinct from 401
`DELETE /account/tokens/expired` (:1132-1139, cut off but tagged Auth, "Restricted to
administrators") is the one account-adjacent endpoint gated by role rather than mere
auth — implying a genuine `admin` role check exists server-side, separate from
`isAuth`. (No account SCREEN in this batch's scope is `admin`-gated; this is included
only because a guard test in scope, `tests/unit/app/guards/authentications.spec.ts`,
may exercise the `admin` branch generically.) A client guard collapsing "not admin" and
"not authenticated" into the same redirect target is not itself a spec violation (Tier A
doesn't prescribe client redirect targets), but treating "admin-required" and
"auth-required" as the same predicate (i.e. never denying a merely-authenticated
non-admin user) would contradict the existence of this endpoint's role restriction — S1.

## E5 — Login response carries the access token in the body; refresh token lives in an HttpOnly cookie, not the body the client should persist
`POST /account/login` (:998-1024) returns `AuthTokensEnvelope` → `AuthTokens`
(:4662-4676): `token` (required, the access JWT), optional `refreshToken`, optional
`expiresIn` (seconds). `GET /account/refresh` (:1097-1115) "creates a new short-lived
access token from the refresh token in the `jwt` cookie. The cookie is HttpOnly, so the
token is never readable by page scripts" (:1102). So: the refresh credential's
authoritative home is a server-set HttpOnly cookie the client cannot read or store
itself; `AuthTokens.refreshToken` in the body is documented only as "if returned by
backend" (:4672) — a client that persists/reads a body-level `refreshToken` value is not
contradicted by Tier A, but a client that relies on JS reading the `jwt` cookie directly
is impossible per :1102 (HttpOnly) and would be a MISMATCH-CODE/SPEC-SILENT if a test
asserts such an ability exists.

## E6 — Session lifetime/"remember me" tiers
`LoginRequest.remember` (:4655-4661) is an optional enum `short`/`medium`/`long`,
"How long the refresh cookie outlives the tab... Omitted, the cookie lives only as long
as an access token." So: a login WITHOUT `remember` produces a session that does NOT
survive past the access token's own lifetime — no persistent "stay logged in after tab
close" behavior is the default. A login WITH any `remember` tier is expected to persist
the refresh cookie beyond a single access-token lifetime/tab session, sized by
deployment (exact durations are not specified client-side). A session-restore guard/test
that treats "no `remember` was sent at signup/login" as equivalent to "persist
indefinitely across browser restarts" contradicts this — S1 candidate (session survives
longer than spec allows).

## E7 — `GET /account/sessions` / session-restore semantics: `current` is cookie-matched, not bearer-matched
`Session.current` (:4482-4484): "Whether this session is the one making the request,
matched through the refresh cookie... Always `false` for a caller authenticating by
bearer token alone — an access token does not identify a session." So a restore flow
that reconstructs "am I logged in" purely from the presence of an access token (bearer)
cannot, per Tier A, ever legitimately mark that session `current: true` from the token
alone — `current` requires the refresh-cookie-carrying request. A test asserting a
freshly bearer-only-restored session shows `current: true` off token possession alone
contradicts :4482-4484.

## E8 — Logout semantics: single-session vs. all-sessions, idempotent 200
`POST /account/logout` (:764-776): `security: []` (no auth required to call it), revokes
only the CURRENT session (cookie-carried refresh token), clears auth cookies, "Answers
200 whether or not a live session was found." `POST /account/logout-all` (:1116-1131):
requires `bearerAuth`, revokes ALL refresh tokens/sessions. `DELETE /account/sessions/
{sessionId}` (:797-823): requires `bearerAuth`, revokes one named session by id, 404 if
not found (:818-819), 401 if unauthenticated. A test/guard treating "logout" (no auth
needed, always 200) and "logout-all" (auth needed) as interchangeable, or asserting
`/account/logout` requires a bearer token, contradicts :771 (`security: []`) — MISMATCH
territory.

## E9 — Address book: exactly one `default` when non-empty, demotion rules
`GET /account/addresses` (:824-843): "Whenever it is non-empty, exactly one entry
carries `default`." `POST /account/addresses` (:844-870): "The first entry becomes the
default automatically; a later entry claims the default slot only by sending
`default true`, which demotes the previous holder." `PUT .../{addressId}` (:871-907):
`default true` claims/demotes; `default false` or absent `default` "both leave the
assignment alone." `DELETE .../{addressId}` (:908-936): "Removing the default promotes
the oldest remaining entry, so a non-empty book always has exactly one default." All
four require `bearerAuth`; unauthenticated calls get 401.

## E10 — Change-password does not invalidate other sessions
`POST /account/password` (:740-762): proves possession of the current password (auth
required); "Other sessions stay live — revoke them with `POST /account/logout-all` or
per session via `DELETE /account/sessions/{sessionId}`." A test asserting that changing
one's own password logs out other devices/sessions automatically contradicts this.

## E11 — What a logged-out user may NOT reach (server-side 401 contract)
Every account endpoint EXCEPT `login`, `signup`, `logout`, `reset`, `reset-confirm`,
`verify-confirm`, `delete-confirm` requires `bearerAuth` and documents a `401
Unauthorized` failure. Per Tier A this means: a logged-out caller hitting `GET /account`,
`PUT /account`, `DELETE /account`, `POST /account/password`, `GET/DELETE
/account/sessions[/{id}]`, `GET/POST/PUT/DELETE /account/addresses[/{id}]`, `POST
/account/verify-request`, `POST /account/logout-all` gets 401 from the server
regardless of any client-side guard. A client-side guard that is LOOSER than this — i.e.
lets an unauthenticated request for one of these actually go out expecting success, or
renders the corresponding view without redirecting first — is not itself contradicting
the server (the server still 401s), but a guard/test that asserts these routes are
reachable/renderable without auth, or that never redirects a logged-out user away from
`Profile` (`auth` access per Tier B, E1), is the S1 shape this audit is looking for.

## E12 — `public`-access screens accept a token in the URL path/query, not a session
`AccountDeleteConfirm`/`VerifyEmailConfirm` (Tier B `public`, docs :84-85) correspond to
`DELETE /account/delete-confirm` (:977-996) and `POST /account/verify-confirm`
(:956-976), both `security: []` and both taking a one-time `token` in the request body
(`AccountDeleteConfirmRequest`/`VerifyEmailConfirmRequest`, :4626-4643) — "NOT a JWT."
Neither the account state nor an existing session is required to complete these flows.
`Logout` (Tier B `public`) matches `POST /account/logout`, also `security: []` (E8). A
guard requiring authentication before reaching any of these three routes contradicts
Tier A's `security: []` on their corresponding endpoints.
