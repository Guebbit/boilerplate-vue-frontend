---
source: src/modules/notifications/tests/notifications-bell.spec.ts
sha256: 2f3768faed01842625bab83f805807e107a4a42d20ab0aeb49aeab1ba9ccb550
signature: 8dfdef2f0b082047eda71ebef2ff0e3bbe38b18c747f5da3ad14c74ab422b5e3
generated_at: 2026-11-10T04:49:37.367182+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/notifications-bell.spec.ts

## Purpose

Unit tests for the `NotificationsBell` component mounted against the real Pinia inbox store, with the HTTP transport and SSE stream mocked. Covers guest/signed-in rendering, badge and aria-label behavior, panel open/close lifecycle (read-all, listing, delete, clear-all, empty state), focus management, axe accessibility, and permission-gated work-notice links.

## Key elements

- **`row(id, overrides?)`** – Factory returning a `Notification` fixture (default code `notifications.staff.outbox-dead`). `overrides` lets individual cases patch fields like `readAt`, `createdAt`, or `code`.
- **`signIn()`** – Populates `useSessionStore` with a token, viewer identity, and role so the component treats the caller as authenticated.
- **`mountBell()`** – Mounts `NotificationsBell` with Vuetify, i18n, and a memory-history router; attaches to `document.body`; flushes promises. Returns the `VueWrapper`.
- **`openPanel()`** – Clicks `[data-test=notifications-bell]` and flushes, simulating the user opening the panel.
- **`panel()`** – Queries the teleported panel (`[data-test=notifications-panel]`) from `document.body`, since Vuetify moves it out of the component tree.
- **`requests()`** – Maps the mocked `orvalMutator` call history to `"METHOD /url"` strings for assertion.
- **`holdNotice`** – A static `Notification` fixture (code `notifications.staff.webhook-disabled`, severity `warning`, params `subscriptionId: 's9'`) used by the work-tab tests.
- **`openWorkTab()`** – Clicks `[data-test=notifications-tab-work]` and flushes.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a stub that delegates to `parseOrvalFixture`, reading from the module-level `inboxOnServer` variable.
- **`vi.mock('@/infrastructure/create-sse-client')`** – No-ops the SSE client; the stream is not under test here.
- **`wireModulesIntoCore()`** – Called at module top-level to register i18n and other app modules before tests run.

## Relationships

- **`NotificationsBell.vue`** – The system under test; every assertion targets its rendered output and side effects.
- **`store.ts`** – `useNotificationsInboxStore` is used as a real Pinia store; tests assert its `items` array after mutations.
- **`src/infrastructure/http/index.ts`** – `orvalMutator` is the single HTTP seam that is mocked; all API interactions flow through it.
- **`tests/support/unit/axe.ts`** – `axeViolations()` runs the final accessibility audit against the live DOM tree.
- **`tests/support/unit/expect-warning.ts`** – `expectWarning()` suppresses an expected Vue warning (the `after-enter` transition that jsdom cannot fire).
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture` shapes the mocked transport's response to match the orval-generated schema.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` bootstraps app-level registrations (i18n, etc.) required before mounting.
- **`src/modules/shop-tasks/tests/notices.spec.ts`** – Sibling spec following the same mount-mock-assert pattern for a different module's notification-like UI.

## Notes

- `attachTo: document.body` is mandatory: Vuetify teleports the `VMenu` panel outside the component's DOM subtree, and `axe` can only audit a real document tree.
- The `after-enter` transition event is emitted manually via `wrapper.findComponent(VMenu).vm.$emit('after-enter')` because jsdom does not run CSS transitions; `expectWarning` silences the accompanying Vue warning.
- `inboxOnServer` is a module-level `let` reassigned in `beforeEach` and individual tests; the `orvalMutator` mock closure reads it at call time, so the same mock handles all tests without re-creation.
- The router is a single-route memory-history instance exposing only the `WebhookTarget` route; it exists solely to let `router-link` resolve the work-notice deep link.
- The file is truncated in source; the final test ("offers no link where the reader would be refused") is incomplete.
