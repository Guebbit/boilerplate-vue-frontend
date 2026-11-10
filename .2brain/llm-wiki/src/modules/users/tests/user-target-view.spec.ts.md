---
source: src/modules/users/tests/user-target-view.spec.ts
sha256: 06363c61d9cbb6d2ab3eb0ea76702558eeb151b4b423c053e482017dd14eebcd
signature: 9e6ac775657cdf88590ad3bd60c0375750252346bbd3863584a8d1438c81bbe1
generated_at: 2026-11-10T06:09:23.708429+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-target-view.spec.ts

## Purpose

Vitest suite for the `UserTarget.vue` admin user-detail page. It verifies that every UI control (Edit link, Manage-access button, two-factor strip) is rendered or hidden strictly according to the server-supplied `actions` array on the user row, and that the "Manage access" confirm flow dispatches the correct separate API calls (role assignment + status change) rather than a single PATCH.

## Key elements

- **`queueGetResponses(...users)`** — Sets up `orvalMutator` to return queued `User` fixtures in call order for GETs; non-GET calls resolve with a canned body (or the user for `*-role` URLs). Clamps repeated GETs to the last fixture.
- **`mountPage()`** — Mounts `UserTarget` with `id: 'u1'`, wiring in the memory-history router, Vuetify, i18n, and a stub for `UserAccessDialog`.
- **`signInHolding(tenant)`** — Populates the Pinia session store with a test viewer and the given tenant abilities.
- **`describe('User (detail page)')`** — Six test cases covering: no actions → no buttons; full actions → both buttons; update-only (support agent) → edit + dialog; two-factor present but no control rendered; confirm dispatches `POST /users/u1/assign-role` + `POST /users/u1/deactivate` (no PATCH); cancel produces no writes.
- **Module-level `wireModulesIntoCore()`** — Registers module routes before any test runs (import side-effect).
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a `vi.fn()` so every HTTP call is intercepted.

## Relationships

- **`UserTarget.vue`** (under test) — mounted directly; its `data-test` attributes are the selectors the assertions query.
- **`UserAccessDialog.vue`** — imported for type reference and stubbed in `mountPage`; tests retrieve the stubbed component instance to emit `confirm` / `cancel` events and inspect the `target` prop it receives.
- **`src/infrastructure/http/index.ts`** — `orvalMutator` is the sole HTTP egress; the mock here lets tests assert exact method, URL, and body of every outbound call.
- **`tests/support/unit/fixtures.ts`** — source of `aUser`, `ALL_USER_ACTIONS`, `NO_USER_ACTIONS`, `userActionsOf`.
- **`tests/support/unit/mounted-vm.ts`** — provides `emitOn` for triggering events on the stubbed dialog.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` shapes mock responses; `contractRequest` validates request bodies against OpenAPI schemas before assertion.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore` injects enabled-module routes into the registry so `collectModuleRoutes` returns a real route table.

## Notes

- `UserAccessDialog` is **stubbed**, not rendered for real, to sidestep `v-dialog`'s teleport and lazy-render behaviour under jsdom. Its internal picker logic is covered separately in `user-access-dialog.spec.ts`.
- The suite asserts that a confirm with both a role change and a status change produces **two separate POST calls** (`/assign-role`, `/deactivate`) and explicitly **no PATCH** — the UI does not bundle those into one mutation.
- `queueGetResponses` clamps: if a component re-fetches more times than fixtures were queued, it keeps returning the last one. Tests that expect a post-mutation refetch must supply a second fixture.
- The `twoFactorEnabledAt` test encodes a product rule: a second-factor credential is owner-only, so **no** admin control is rendered regardless of the `actions` payload.
