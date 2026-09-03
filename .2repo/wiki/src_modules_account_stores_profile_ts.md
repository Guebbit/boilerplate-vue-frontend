# src/modules/account/stores/profile.ts

## Purpose

Pinia store (Composition API) that owns the authenticated visitor's own editable account record and every operation against it: fetch, update, role self-service, live password change, email verification, and account deletion. It delegates request/caching to the shared `useStructureRestApi` primitives (`fetchTarget` / `updateTarget`) so no action re-implements HTTP or cache logic.

## Key elements

- **`useProfileStore`** — the exported Pinia store (`accountProfile`). Returns `profile`, `loading`, and all actions below.
- **`fetchProfile(forced?)`** — Loads the account via `GET /account`; sets `selectedIdentifier`, calls `obs.identifyUser`, and publishes the viewer projection to the session store.
- **`updateProfile(userData)`** — `PUT /account` with a self-service payload (email, username, locale, imageUrl, phone, website). Refetches after write so server-side side-effects (e.g. `verified: false` after email change) land in the cache.
- **`updateOwnRole(admin)`** — Routes through `PUT /users/{id}` (the admin-gated route) because `PUT /account` deliberately omits the `admin` field. Refetches so the shell's `isAdmin` projection updates.
- **`changePassword(current, new, confirm)`** — Live password change for the current session. Adopts the fresh access token from the response via `session.setAccessToken`.
- **`requestEmailVerification()` / `confirmEmailVerification(token)`** — Resend and consume the verification token. Confirm is public (no auth required); refetches only when a session exists.
- **`clearSession()`** — Resets the structure cache and clears the session store (used after account deletion).
- **`requestAccountDelete()` / `confirmAccountDelete(token)`** — Two-step deletion flow. Confirm unidentifies the user in observability and calls `clearSession`.
- **`publishViewer(user)`** *(internal)* — Pushes `id`, `email`, `admin`, `imageUrl` into the session store so `isAuth` / `isAdmin` never lag the record.

## Relationships

- **`src/modules/account/stores/auth.ts`** — Explicit boundary: establishing or ending a session (login/logout) is owned by `useAuthStore`, not this store. This file's `clearSession` tears down state via the infrastructure `useSessionStore`, not through the auth store's actions. The two stores partition the "account" domain: auth handles the session lifecycle; profile handles the record and its mutations.

## Notes

- **Refetch-after-write convention**: `updateProfile` and `updateOwnRole` both call `fetchProfile(true)` after the mutation. The rationale (documented inline): `updateTarget` merges only what was *sent*; the server writes facts the payload never carried (e.g. `verified: false`), so a local patch would be incomplete.
- **Role change via admin route**: `updateOwnRole` calls `apiUpdateUserById` (the admin users endpoint) because no dedicated self-service role endpoint exists in the backend contract. A non-admin caller receives a 403 from the API guard — this is intentional, not a bug.
- **`updateProfile` payload is intentionally narrow**: no `password`, no `admin`, no account state. Password changes go through `changePassword`; role changes go through `updateOwnRole`.
- **`changePassword` adopts a new token**: the API revokes other sessions and returns a fresh access token for the current one. Failing to call `session.setAccessToken` would leave the session with a revoked credential.
- **Sessions & addresses are NOT here**: device-session list and address book are owned by `stores/sessions.ts` and `stores/addresses.ts` respectively.
