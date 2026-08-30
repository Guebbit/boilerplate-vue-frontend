# src/modules/account/stores/profile.ts

## Purpose

Pinia store (Composition API) that owns the visitor's own editable account record and every operation on it: fetching/updating the profile, self-service role change, live password change, email verification, and two-step account deletion. It delegates request and cache management to the shared `useStructureRestApi` primitives (`fetchTarget`, `updateTarget`, `fetchAny`) so no action duplicates HTTP or caching logic.

## Key elements

- **`useProfileStore`** — the store, registered as `'accountProfile'`. Exposes `profile` (the cached `User` record), `loading`, and the actions below.
- **`fetchProfile(forced?)`** — Loads the authenticated user via `apiGetAccount`, sets `selectedIdentifier`, calls `obs.identifyUser`, and publishes a viewer projection to the session store.
- **`updateProfile(userData?)`** — Sends a self-service `PUT /account` with only user-owned fields (email, username, locale, imageUrl, phone, website). Refetches after the write because the server may alter state the patch didn't carry (e.g. `verified: false` after an email change).
- **`updateOwnRole(admin: boolean)`** — Routes through the admin `PUT /users/{id}` endpoint (the only endpoint that touches the `admin` field), then refetches so `isAdmin` in the shell updates.
- **`changePassword(currentPassword, password, passwordConfirm)`** — Proves the current credential and sets a new one on the live session only.
- **`requestEmailVerification()`** / **`confirmEmailVerification(token)`** — Re-send and spend the verification link. The confirm path is public (no session required); it refetches the profile only when a session exists.
- **`requestAccountDelete()`** / **`confirmAccountDelete(token)`** — Two-step deletion. On confirm, clears the observability identity and the local session + cache via `clearSession()`.
- **`clearSession()`** — Resets the `useStructureRestApi` cache and calls `session.clearSession()` so a stale profile cannot flash before the guard redirects.

## Relationships

- **`src/modules/account/stores/auth.ts`** — Owns session establishment and teardown. This store deliberately does *not* establish or end sessions; it only reads `session.isAuth` and calls `session.setViewer` / `session.clearSession`. The boundary is explicit: auth.ts = lifecycle, this store = the editable record.
- **`docs/index.md`** — Top-level documentation index that orients readers to the account module's store split (profile vs. auth vs. sessions vs. addresses).
- **`docs/tools/security.md`** — Documents the observability integration (`identifyUser` / `unidentifyUser`) and the password/deletion flows this store exposes, providing the security context for why those actions exist here rather than in a generic user-admin path.

## Notes

- **Two refetch-after-write patterns:** `updateProfile` and `updateOwnRole` both call `fetchProfile(true)` after the mutation because `updateTarget` merges only what was *sent*, while the server may write fields the payload never included (e.g. `verified`, `admin`). The store's rule is "never invent state."
- **Role change is not in `updateProfile`:** `PUT /account` intentionally excludes `admin`. Routing a role change through it would let any visitor self-promote. `updateOwnRole` uses the admin-guarded `PUT /users/{id}` instead; a non-admin calling it gets a 403 from the API.
- **`@api` barrel is infrastructure, not a sibling module:** `updateUserById` is imported from `@api`, not from the users module, to avoid creating an `account → users` dependency edge.
- **`getPayloadFromResponse`** unwraps the shared HTTP envelope; every API call goes through it before touching the record.
- The store is typed as `useStructureRestApi<User, string>`, meaning the identifier is a string user ID and the record is a `User` shape from `@types`.
