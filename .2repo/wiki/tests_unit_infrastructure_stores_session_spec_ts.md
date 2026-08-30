# tests/unit/infrastructure/stores/session.spec.ts

## Purpose

Unit tests for the `persistLocalePreference` method of the session store. The single invariant under test is that **choosing a language always succeeds regardless of auth state or API outcome**, which is what allows `AppLanguageSwitcher` to fire-and-forget the call without knowing what a session is.

## Key elements

- **`vi.mock('@api', …)`** – Replaces the entire `@api` module; only `updateAccount` is exercised (wrapped in `updateAccountMock`). The other exports (`getAccount`, `refreshToken`, `logout`, `logoutAll`) are inert placeholders required by the mock shape.
- **`signedIn()`** – Helper that builds a store with *both* a token and a viewer, which is the real `isAuth` precondition. Used by the "happy" and "failure" cases.
- **`describe('persistLocalePreference')`** – Five cases covering:
  - writes `{ locale }` to the account for a signed-in user
  - makes **no** API call for a guest (no token, no viewer)
  - makes **no** API call when a token exists but the viewer is still unknown
  - **resolves** (does not reject) when the API call rejects
  - **resolves to `undefined`** on success, so the caller can safely ignore the promise

## Relationships

- Imports the **real** `useSessionStore` from `@/infrastructure/stores/session.ts` (the system under test).
- Mocks `@api` at the network boundary; no other module interaction is exercised.

## Notes

- The store is intentionally **not** stubbed: `isAuth` is a derived getter over token + viewer, so stubbing it would test the stub rather than the real auth logic.
- A token *without* a viewer is treated as **not** signed in — this is a deliberate edge case (session restored but identity not yet resolved) and is covered by its own test.
- The "resolves, never rejects" contract is the critical guarantee: the UI caller fires the promise without awaiting it, so an escaped rejection would surface as an unhandled rejection on a page that otherwise worked fine.
