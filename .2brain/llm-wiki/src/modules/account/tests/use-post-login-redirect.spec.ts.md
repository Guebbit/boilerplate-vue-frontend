---
source: src/modules/account/tests/use-post-login-redirect.spec.ts
sha256: 2676e2c258e49e361ab5b41cc25de7417e258e082bd91db85eb057559b2527f6
generated_at: 2026-10-02T12:34:50.506200+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-post-login-redirect.spec.ts

## Purpose

Vitest spec for the `usePostLoginRedirect` composable. It verifies two security/behavioral invariants of `redirectAfterLogin()`: (1) the `?continue=` query param is only honored when it is a single same-origin path, falling back to the `Home` route for arrays, protocol-relative strings (`//evil.example`), and absolute URLs; and (2) a saved language preference is applied exclusively through routing (`params.locale`) and never by calling `changeLanguage` directly (regression FA26).

## Key elements

- **`usePostLoginRedirect`** (imported from `@/modules/account/composables/use-post-login-redirect.ts`) — the system under test; exposes `redirectAfterLogin()`.
- **`currentRoute`** — mutable object standing in for `vue-router`'s `useRoute()`; tests rewrite `.query` per case.
- **`push`** — mock for `useRouter().push`; all navigation assertions target it.
- **`changeLanguageMock`** — mock for `@/i18n.changeLanguage`; every test asserts it was **not** called.
- **`profileState`** — mutable mock backing `useProfileStore`; toggles `profile.locale` to simulate saved language preferences.
- **Mock factories** — `vue-router`, `vue-i18n`, `@/i18n`, `@/i18n/router-link.ts`, and `@/modules/account/stores/profile.ts` are all replaced via `vi.mock` before the SUT is dynamically imported with `await import(...)`.

## Relationships

No graph neighbors are recorded. The only direct production import is the SUT itself (`@/modules/account/composables/use-post-login-redirect.ts`). All other referenced modules (`vue-router`, `vue-i18n`, `@/i18n`, `@/i18n/router-link.ts`, `@/modules/account/stores/profile.ts`) are mocked and do not appear as real dependencies in the test's execution path.

## Notes

- **FA26 guard is asserted everywhere.** Every test includes `expect(changeLanguageMock).not.toHaveBeenCalled()`. Omitting that assertion would silently allow the "activate-then-navigate" anti-pattern that broke the locale guard.
- **Dynamic import after mocks.** The SUT is loaded via `await import(...)` at module top level, *after* all `vi.mock` calls. Do not add a static import of the SUT above the mocks — it would execute before the factories are registered.
- **Mutable top-level state.** `currentRoute` and `profileState` are mutated in each test and reset in `beforeEach`. They are shared across the entire `describe` block, so tests are order-sensitive if `beforeEach` is removed.
- **`routerLinkI18n` is a pass-through mock** (`location => location`); it does no i18n path rewriting in these tests.
- **Eslint disable on one line.** The `not.toHaveBeenCalledWith(expect.objectContaining({ params: ... }))` assertion carries an `eslint-disable-next-line` for `@typescript-eslint/no-unsafe-assignment` because Vitest types nested `objectContaining` as `any`.
