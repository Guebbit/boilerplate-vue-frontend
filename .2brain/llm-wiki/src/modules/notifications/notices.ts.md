---
source: src/modules/notifications/notices.ts
sha256: 25960ee8f62aa4c55024d304cf8cb05700da965553e907a42240c7c9aac1082f
signature: a461f982a9ba604dcf324bf5998ca598024a4d7b0facb8943bbe7ca9a52c7f86
generated_at: 2026-11-10T04:48:27.517443+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/notices.ts

## Purpose

Declares the foundation's six staff-facing notification codes as `AppNotice` entries (each with a `describe` and a `target`). This file is the single place that names the wording keys and route targets for those codes; nothing else in the codebase references their text or destinations.

## Key elements

- **`foundationNotices`** (export) — `Record<string, AppNotice>` mapping all six `notifications.staff.*` codes to their display/route definitions.
- **`describeTask` / `taskTarget` / `taskNotice`** — Shared `AppNotice` for the four task codes (`task-opened`, `task-overdue`, `task-due-soon`, `task-assigned`). `describeTask` builds the sentence from `TaskKind` (and optionally `TaskCategory`); `taskTarget` routes to a server-supplied `work` path or falls back to `TaskDetail`.
- **`OUTBOX_FAMILY_TARGETS`** — `Map<string, { route: string }>` pairing event-family prefixes (e.g. `order`, `user`) with their target route.
- **`outboxDeadTarget`** — Resolves a parked-event name + aggregate id to a `NoticeTarget`, or returns `undefined` for erased records / unknown families.
- **`isOneOf`** — Small type guard that checks a server-supplied string against a closed enum set, falling back to an `"unknown"` key.
- **`Of<TCode>`** — Type-level helper (`Extract<Notification, { code: TCode }>`) giving per-code params typing.

## Relationships

- **`contracts/rest/index.ts`** — Source of the `Notification` wire type (re-exported via `@types`); `foundationNotices` keys and `params` shapes must match that contract.
- **`src/modules/notifications/module.ts`** — Consumes `foundationNotices` and registers it as the module's `notices` collection for the shell.
- **`src/modules/notifications/tests/notices.spec.ts`** — Unit tests covering `describeTask`, `taskTarget`, and `outboxDeadTarget` behavior.

## Notes

- The four task codes all point to the **same** `taskNotice` object; they differ only in the dictionary key (`notice.code`) passed to `translate`.
- `isOneOf` intentionally handles the case where a newer backend sends an enum value this client doesn't know yet — it degrades to `task-kind.unknown` / `task-category.none` rather than crashing.
- `outboxDeadTarget` returns `undefined` (no link) for `user.erased`, `product.deleted`, and any family missing from `OUTBOX_FAMILY_TARGETS`. The design choice is "no link" over a potentially wrong link.
- The `route:` string literals in `OUTBOX_FAMILY_TARGETS` are the shape a route-name sweep tool recognises; don't restructure them without checking that tooling.
