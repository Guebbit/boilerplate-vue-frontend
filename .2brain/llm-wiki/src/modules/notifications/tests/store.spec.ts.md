---
source: src/modules/notifications/tests/store.spec.ts
sha256: eb7094cab6df6443b44ba4c488eac78787f436a3ae33093eaf263d4fdd76a229
signature: 551c88a042ff1d59ad139db26cec015580e0a9a56a46d50b434bbbfcad3a3c87
generated_at: 2026-11-10T04:50:04.914272+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/store.spec.ts

## Purpose

Integration-style spec for `useNotificationsInboxStore` that verifies how server rows become persistent messages in the vue-toolkit message store, how concurrent reads and stream frames interact, and what each failure mode leaves behind. Transport is mocked (one router keyed on `METHOD /url`), but the generated HTTP client, the toolkit store, and the inbox store under test are all real, so the property under test is their combined behaviour.

## Key elements

- **`answers` / `vi.mock('@/infrastructure/http')`** — Module-level mock of `orvalMutator`; each test sets `answers['METHOD /url']` to a canned payload (validated through `parseOrvalFixture`) or a thunk that rejects/acts mid-request.
- **`row(id, overrides)`** — Factory for a well-formed `Notification` (code `notifications.staff.outbox-dead`) with overridable fields.
- **`serverHolds(rows)`** — Convenience to set `GET /notifications` to resolve with the given list.
- **`refusal(status)`** — Returns a thunk that rejects with a shaped error (`status` + `errors[].message`), mimicking `onResponseReject`.
- **`holdRead(rows)`** — Returns a release function; `GET /notifications` stays pending until the test calls it, enabling overlapping-read scenarios.
- **`describe('sync', …)`** — Covers passive-header assertion, newest-first ordering, i18n text, quiet vs. toast visibility, in-place row update, auto-hide suppression, removal of server-dropped rows, non-notification message preservation, stream-during-read races, and failed-read recovery.
- **`describe('a read that is still out when something else happens', …)`** — (truncated) Overlapping-read and stream-interleaving cases using `holdRead`.
- **`ECHO_CODE` / `echoPreferred`** — A stand-in `AppNotice` whose `describe` echoes the `preferred` languages, used to verify i18n plumbing without a real module code.
- **`beforeEach`** — Registers module notices, creates a fresh Pinia, clears mocks, seeds default 200-undefined answers for `POST /notifications/read-all` and `DELETE /notifications`, and loads the `en` locale.

## Relationships

- **`src/modules/notifications/store.ts`** — Exports `useNotificationsInboxStore`, the system under test; every `describe` block drives its `sync`, `receiveCreated`, and `receiveC` (truncated) methods.
- **`src/infrastructure/http/index.ts`** — Exports `orvalMutator`, the HTTP transport this spec intercepts so no real requests are issued; the mock routes every call through `parseOrvalFixture` before resolving.
- **`tests/support/unit/orval-fixture-schema.ts`** — Exports `parseOrvalFixture`, which validates every canned response against the generated orval response schema, preventing fixture drift from the contract.
- **`tests/support/unit/wire-modules.ts`** — Exports `wireModulesIntoCore`, called at module scope to register the test modules so that `collectModuleNotices` and `registerNotices` (used in `beforeEach`) have modules to iterate over.

## Notes

- The mock router key is `METHOD /url` (e.g. `GET /notifications`), not the full config object; any test that needs a dynamic or failing response sets the value to a function instead of a plain object.
- `parseOrvalFixture` is called inside the mock *and* inside `holdRead`/dynamic thunks, so even "mid-request" answers must conform to the schema.
- The spec asserts the `Session-Passive: true` header on the sync GET, tying the store's "passive" contract to the transport layer.
- `vi.useFakeTimers()` / `vi.useRealTimers()` are managed per-test; `afterEach` always restores real timers.
- The `ECHO_CODE` constant is deliberately outside the real notice-code union; the comment notes the `never` cast at usage sites is intentional.
