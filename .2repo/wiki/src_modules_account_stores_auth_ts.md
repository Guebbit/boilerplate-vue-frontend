# src/modules/account/stores/auth.ts

## Purpose

Pinia store (Composition API) that owns the **session lifecycle**: login, signup, password reset, and the two logout paths. It deliberately does *not* hold the editable user record — that lives in `profile.ts`. The split keeps "am I signed in?" separate from "what does my record say?".

## Key elements

- **`useAuthStore`** — the single exported store (`'accountAuth'`).
- **`login(email, password, remember?)`** — calls the login API, extracts the token via `getTokenFromResponse`, stores it in the session store (setting `isAuth` cookie), then triggers `useProfileStore().fetchProfile(true)`.
- **`signup(credentials, options?)`** — registers a new account. Branches to `signupWithMultipart` when `imageUpload` is present, otherwise plain JSON. Does **not** set a token; the backend requires email confirmation + separate login.
- **`requestPasswordReset(email)`** — sends the reset-token email.
- **`confirmPasswordReset(token, password, passwordConfirm)`** — completes the reset.
- **`logout()`** — revokes the current session, unidentifies in observability, clears local token/cookie, and calls `useProfileStore().resetAll()`.
- **`logoutEverywhere()`** — same teardown but revokes **all** refresh tokens (compromised-credentials path).

All actions are wrapped in `fetchAny` from `useStructureRestApi`, which feeds global loading state through `useCoreStore`.

## Relationships

- **`src/modules/account/stores/profile.ts`** — After a successful `login`, this store calls `useProfileStore().fetchProfile(true)`. On `logout`/`logoutEverywhere` it calls `useProfileStore().resetAll()` to drop cached profile data. This is the only cross-store coordination in the file.

## Notes

- **`.then` chaining, not `await`.** Each action chains the session/profile side-effects as `.then` callbacks rather than sequentially awaiting them. This is intentional (documented in the module JSDoc) and means the returned promise resolves after the profile fetch, not just after the API call.
- **`remember` is binary at the UI level** but maps to `LoginRequestRemember.medium` (≈ 30 days) or `undefined`. There is no "long" tier here.
- **`signup` takes a single object** (not positional args) to avoid transposition of `imageUpload` / `options` and to make the `username ← email` / `passwordConfirm ← password` defaults explicit.
- **httpOnly `jwt` cookie** can only be cleared server-side; `logout`/`logoutEverywhere` rely on the session store to issue the right API call. The JS-accessible `isAuth` flag is cleared locally.
- **No token is set on signup.** Callers must direct the user to confirm email and then call `login`.
