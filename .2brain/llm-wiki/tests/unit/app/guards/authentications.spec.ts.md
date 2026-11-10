---
source: tests/unit/app/guards/authentications.spec.ts
sha256: 1762fa4faef8d936bf2015730aa009d1d9eecc20cfb2d0b776b655a2d23ba61c
signature: 221a601d4751d06434e374f4ac5383afb6421114eed789de11815c72c8d5ef8c
generated_at: 2026-11-10T07:45:50.431271+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/guards/authentications.spec.ts

## Purpose

Unit tests for the two exported guard functions `canAccess` and `enforceRouteAccess` from `@/app/guards/authentications`. The file verifies that the pure access-decision logic (`canAccess`) handles every combination of route meta, visitor standing, and CASL rules correctly, and that the side-effecting guard (`enforceRouteAccess`) produces the right redirect target and toast message for each rejection case.

## Key elements

- **`vi.mock` blocks** — Replace `@/infrastructure/session` (with a `held: Set<string>` of `"action subject"` pairs), `pinia`'s `storeToRefs` (with a `visitorStanding` ref), `@guebbit/vue-toolkit`'s notifications store (with `addMessageMock`), and `@/i18n` (identity `translate` so assertions read dictionary keys, not locale-dependent strings).
- **`route()` helper** — Builds a minimal `RouteLocationNormalized` stub (via `asStub`) carrying `fullPath`, `params.locale`, and the `meta.access` / `meta.can` fields the guard reads.
- **`visitor()` helper** — Returns an object with `isAuth` and a `can(action, subject)` predicate backed by a flat string list, standing in for a real CASL `Ability`.
- **Named visitor presets** — `guest`, `customer`, `editor`, `shopper`, `orderStaff`, `owner`: shorthand for common permission sets used across both test suites.
- **`describe('canAccess')`** — A single `it.each` truth-table covering 25 rows spanning `public`, `guest-only`, `auth-only`, rule-gated, `open`, and staff-action routes against every visitor preset.
- **`describe('enforceRouteAccess')`** — Eleven behavioral tests covering: pass-through, guest→Login redirect (with continue target), no-Login-route fallback to Home, authenticated-but-unauthorized→Home, `open`-route guest pass-through, `open`-route authorized rejection, guest-only rejection of signed-in users, rule-grant pass-through, staff-action distinction, and cross-action rejection (e.g. `read User` ≠ `update User`).

## Relationships

- **`tests/support/stub.ts`** — Provides the `asStub<T>()` generic used to satisfy TypeScript's structural typing when constructing the minimal `RouteLocationNormalized` object passed to `enforceRouteAccess`.

The remaining listed neighbors (`a11y-coverage.spec.ts`, `sitemap-document.spec.ts`, `visual-sweep.ts`) share no imports or runtime interaction with this file.

## Notes

- **Exhaustive truth-table style**: The `canAccess` suite is deliberately a full truth table rather than a sampled set, because the function is a pure predicate over a small domain. The comments call out that the "rows nobody thinks to test" (e.g. a signed-in visitor on a guest-only page) are where regressions hide.
- **`translate` is mocked to identity**: Assertions check i18n *keys* (`'navigation.error-not-logged'`) instead of rendered strings, keeping tests locale-independent.
- **`held` set vs. `visitor()` can-callback**: The `vi.mock` for the session store uses the module-level `held` set; the `visitor()` helper builds its own closure. Both encode the same `"action subject"` string convention but serve different suites (store-based `enforceRouteAccess` tests vs. pure-function `canAccess` tests).
- **`beforeEach` resets `visitorStanding.isAuth` and `held`** only in the `enforceRouteAccess` suite; the `canAccess` suite is stateless because `visitor()` captures its rules in a closure per call.
- **Redirect-vs.-403 design intent**: The tests assert that guests are redirected to `Login` with a `continue` param (preserving the original path), while authenticated-but-unauthorized visitors go to `Home` without a continue target — the comment explains that re-login cannot grant a missing permission, so a loop would result.
