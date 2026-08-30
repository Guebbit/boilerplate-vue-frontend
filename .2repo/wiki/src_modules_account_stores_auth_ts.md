# src/modules/account/stores/auth.ts

## Purpose

Pinia store (Composition API, id `accountAuth`) that owns the **session lifecycle**: login, signup, password-reset, and the two logout paths. It wraps the generated REST calls from `@api`, coordinates with the session and profile stores, and fires analytics events. It deliberately does **not** hold editable profile data — that belongs to the sibling `profile.ts` store.

## Key elements

- **`useAuthStore`** — the exported Pinia store; all other items below are its returned members.
- **`login(email, password, remember?)`** — calls `apiLogin`, extracts the access token via `getTokenFromResponse`, stores it in the session store, then triggers `profileStore.fetchProfile(true)`. `remember=true` maps to `LoginRequestRemember.medium` (≈ 30-day refresh cookie); `false` leaves the cookie session-scoped.
- **`signup(credentials, options?)`** — registers a new account. Accepts a single credentials object (`email`, `password`, optional `username`/`passwordConfirm`/`imageUpload`) plus optional `AxiosRequestConfig`. Switches to `signupWithMultipart` when an image file is present. Does **not** set a token — the backend requires email confirmation before login.
- **`requestPasswordReset(email)`** — sends a one-time reset token to the given address.
- **`confirmPasswordReset(token, password, passwordConfirm)`** — finalises the reset with the token and new credentials.
- **`logout()`** — ends **this** session: fires analytics (`USER_LOGGED_OUT`), calls `obs.unidentifyUser()`, calls `session.logout()`, then `profileStore.resetAll()`.
- **`logoutEverywhere()`** — same local cleanup but calls `session.logoutAll()` to revoke **all** refresh tokens (compromised-credentials path).

## Relationships

- **`src/modules/account/stores/profile.ts`** — Called after `login` (`fetchProfile(true)`) and on both logout paths (`resetAll()`). This is the primary cross-store dependency; auth never mutates profile data directly.
- **`docs/index.md`** (and the `docs/theory/modules.md` page it indexes) — Referenced in the file's docstring as the architectural rationale for splitting the account domain into separate auth and profile stores.

## Notes

- All API actions are wrapped in `fetchAny` from `useStructureRestApi`, which manages the global loading indicator via `useCoreStore`'s `getLoading`/`setLoading`.
- Actions chain with `.then()` rather than sequential `await`; the module docstring flags this as a deliberate style choice.
- `signup` takes a single object instead of six positional args to prevent silent transposition of `imageUpload` / `options` and to make the `username`-defaults-from-`email` and `passwordConfirm`-defaults-from-`password` fallbacks explicit.
- The `httpOnly` JWT cookie is cleared only server-side; the JS-accessible `isAuth` flag is cleared locally by `session.logout()`.
- Analytics (`useObservabilityStore.track` + `unidentifyUser`) fire on **both** logout paths but **not** on login or signup — check whether that is intentional before adding events.
