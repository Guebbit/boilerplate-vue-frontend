---
source: src/modules/notifications/tests/notifications-bell.spec.ts
sha256: 3966e711dda73414687fdb4d9634f2bf09f02981fb522f1cad835fb28363a412
generated_at: 2026-10-17T01:09:52.202745+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/notifications-bell.spec.ts

## Purpose

Vitest unit-test suite for the `NotificationsBell` component. It mounts the real component against the real Pinia inbox store, mocks the HTTP transport and SSE stream, and verifies the full user-facing lifecycle: guest invisibility, unread badge/aria labeling, panel open/close, listing, per-row delete, clear-all, focus management, order-link rendering, and an axe-core accessibility pass.

## Key elements

- **`row(id, overrides?)`** — Factory returning a well-formed `Notification` (defaults to `notifications.cart-line-removed`) with per-field overrides, so each test only specifies what it needs.
- **`inboxOnServer: Notification[]`** — Module-level mutable array read by the `orvalMutator` mock at call time; tests reassign it in `beforeEach` to control server state.
- **`signIn()`** — Populates the session store (token, viewer, CASL `read Notification` ability) so the bell renders.
- **`mountBell()`** — Mounts `NotificationsBell` with Vuetify, i18n, and a memory router; attaches to `document.body` because Vuetify teleports the panel.
- **`openPanel()` / `panel()`** — Click the `[data-test=notifications-bell]` trigger, flush promises, and locate the teleported panel in the DOM.
- **`requests()`** — Reads `orvalMutator` mock calls back as `"METHOD url"` strings for assertion.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a resolver that routes GET to `orvalEnvelope({ items: inboxOnServer })` and other verbs to an empty envelope, parsed through `parseOrvalFixture`.
- **`vi.mock('@/infrastructure/create-sse-client')`** — Stubs the SSE client to a no-op `{ close }`; the stream is explicitly out of scope.
- **`wireModulesIntoCore()`** — Called once at module top-level (before any test) to register test-support module aliases.
- **`describe` blocks** — Guest, signed-in label/badge, panel open (read-all, new-flag, ordering, empty, no-op read), panel interactions (delete, clear-all, focus), axe audit, order-link.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/notifications/components/NotificationsBell.vue` | The system under test; mounted directly and driven via `data-test` selectors. |
| `src/modules/notifications/store.ts` | `useInboxStore().items` is asserted after delete and clear-all actions. |
| `src/infrastructure/http/index.ts` | `orvalMutator` is the sole mocked HTTP seam; every network call is recorded and inspected through it. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is invoked at import time to make `@/`-prefixed resolvers functional in the test runtime. |
| `tests/unit/infrastructure/http/orval-fixture-schema.ts` | `orvalEnvelope` and `parseOrvalFixture` shape the mock responses so they match the real transport contract. |

## Notes

- **`attachTo: document.body`** is required, not optional: Vuetify's `VMenu` teleports the panel outside the component root, so `wrapper.find` cannot see it. The panel is always queried from `document.body`.
- **jsdom limitations:** The focus-management test manually emits `after-enter` on `VMenu` because jsdom never plays CSS transitions. The axe audit disables `color-contrast` and `region` rules that require computed layout.
- **`inboxOnServer` is read at call time**, not at mock-definition time, which is why it is a `let` and reassigned per test rather than captured in a closure.
- Selectors use `data-test` attributes exclusively; no reliance on Vuetify class names, keeping tests decoupled from styling changes.
- The router is a single `OrderTarget` route matching the real app's order detail pattern; no other routes are needed for the bell's link assertions.
