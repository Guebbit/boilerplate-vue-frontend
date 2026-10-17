---
source: tests/unit/app/guards/authentications.spec.ts
sha256: 14b8d008bb92b07f0c71e09df24b36fbf47e4257e10b67f60756141b39ae88ed
generated_at: 2026-10-17T02:30:37.261437+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/guards/authentications.spec.ts

## Purpose

Unit tests for the `canAccess` pure function and the `enforceRouteAccess` route guard from `@/app/guards/authentications`. They pin down the full truth table of access decisions (guest, auth, open, guest-only routes combined with CASL-style permission rules) and the redirect/toast behavior the guard produces when a visitor is denied.

## Key elements

- **`canAccess` truth-table block** — `it.each` with ~25 rows covering every combination of `access` level (`public`, `guest`, `auth`, `open`, absent) and `can` rule (absent, same action, different action on same subject, staff `display` vs customer `read`). Verifies the pure decision with no side effects.
- **`enforceRouteAccess` describe block** — 11 scenario tests exercising the guard's observable behavior: redirect target (`Login`, `Home`), locale param forwarding, "continue" URL preservation in the login redirect, toast key emitted (`navigation.error-not-logged`, `navigation.error-forbidden`, `navigation.error-already-logged`), and the no-op path when access is granted.
- **Mocked dependencies** — `@/infrastructure/session` (returns a `can` backed by a mutable `Set<string>` of `"action subject"` pairs), `pinia` (`storeToRefs` returning a shared `isAuth` ref), `@guebbit/vue-toolkit` (toast dispatcher spy), `@/i18n` (identity `translate` so assertions match dictionary keys).
- **Helper factories** — `route()`, `visitor()`, `routerWithLogin` / `routerWithoutLogin`, and named visitor presets (`guest`, `customer`, `editor`, `shopper`, `orderStaff`, `owner`) keep each test case one-liner.
- **`beforeEach`** — resets the `isAuth` ref, clears the `held` set, and clears all mock calls.

## Relationships

- **`tests/support/stub.ts`** — imports `asStub` to build a minimal `RouteLocationNormalized` object typed without requiring a real router instance.

## Notes

- The `canAccess` table is intentionally exhaustive (every access level × every visitor standing). The comment in the source flags that the "rows nobody thinks to test" are where regressions hide.
- `translate` is mocked to the identity function so toast assertions compare against i18n dictionary keys, not locale-dependent strings.
- `enforceRouteAccess` returns `undefined` on success; a non-`undefined` return is a redirect descriptor (`{ name, params }`). Tests assert `toBeUndefined()` for the pass case.
- The "continue target" test serialises the redirect object to JSON and checks it contains the original `fullPath`—a deliberate choice to verify the nested `query`/`params` shape without over-specifying.
- The `routerWithoutLogin` case guards against builds that omit the `account` module; the guard must fall back to `Home` rather than throw on an unresolvable route name.
