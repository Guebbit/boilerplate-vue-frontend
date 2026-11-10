---
source: src/modules/notifications/tests/notices.spec.ts
sha256: 33e6ddf11edff8cb735570d7cb7e3f3a198532192a1f82410acbb20380206efe
signature: 5969520a91003ec55723d8ecd2ed74021dca941a44f00e66e982a6dc5cae59e9
generated_at: 2026-11-10T04:49:19.222923+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/notices.spec.ts

## Purpose

Vitest spec for the `foundationNotices` registry. It asserts, for each of the six staff-facing notice codes, which dictionary entry `describe` reaches and which route/params `target` links to — using a stub translator so assertions are on key structure, not English wording.

## Key elements

- **`context`** — A fixed `NoticeContext` stub whose `translate` prints `key|name=value|…` in insertion order, making the reached dictionary entry and its named args directly assertable.
- **`entryOf(notice)`** — Looks up `foundationNotices[notice.code]`; throws if the code is undeclared.
- **`opened(params)`** / **`dead(eventName)`** — Small factories that build a `Notification` row with a fixed `taskId`/`aggregateId` and variable `kind`, `category`, or `eventName`.
- **`said(notice)`** — Shorthand for `entryOf(notice).describe(notice, context)`.
- **`describe("the foundation declares exactly its six codes")`** — Asserts the exact, sorted key set of `foundationNotices`.
- **`describe("a webhook switched off")`** — Verifies `describe` emits the bare key (no named args) and `target` routes to `WebhookTarget` with the subscription id.
- **`describe("a dead event")`** — Checks `describe` names the parked event; `it.each` table maps ~11 event names to their expected target route (`UserTarget`, `OrderTarget`, `ProductTarget`, `ExampleTarget`); a second `it.each` confirms four events with no surviving record or unknown family assert `toBeUndefined()` for their target.
- **`describe("a task notice")`** — Covers `task-opened`, `task-overdue`, `task-due-soon`, `task-assigned`: category naming for contact messages, "unknown" fallback for unrecognised kinds/categories, shared `TaskDetail` target, and the `work` param override that returns `{ path }` instead of `{ route, params }`.

## Relationships

- **`src/modules/notifications/notices.ts`** — Source under test. Provides `foundationNotices`, the object whose entries expose `.describe()` and `.target()`.
- **`@types`** — Supplies the `Notification` type used to shape test fixtures.
- **`@/kernel/registry`** — Supplies the `NoticeContext` type for the stub translator.

## Notes

- The stub translator is the critical indirection: tests never assert on rendered English, only on the dictionary key and its named-argument shape. Changing a translation string won't break these tests.
- `target` can return two shapes — `{ route, params }` (router link) or `{ path }` (direct path, used when a `work` param overrides the default task page). Callers must handle both.
- The "unknown kind/category" cases (`from_the_future`) exist to pin the forward-compatibility contract: an unrecognised value degrades to `task-kind.unknown` / `task-category.none` rather than leaking the raw string.
- The file uses `it.each` for event-family routing; adding a new event family requires a new row there.
