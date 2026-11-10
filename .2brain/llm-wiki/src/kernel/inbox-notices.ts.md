---
source: src/kernel/inbox-notices.ts
sha256: f3ad34e5455990ca3187fea1a76f69ec90dc10dc78579fcb5e39a6adf1afe6fe
signature: 13e3a082756b42c4473cdd961325b02f32873a7035376a716d6ad69068d82e2f
generated_at: 2026-11-10T03:15:57.866896+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/inbox-notices.ts

## Purpose

Decouples readers of the notification bell from the module that populates it. It extracts inbox rows (stamped `source: 'inbox'` in the toolkit's persistent messages) into plain notices, and hosts a boot-time registry that maps notice codes to their display wording and links—so sibling modules never import the notifications module directly.

## Key elements

- **`InboxNotice`** (interface) — Minimal shape a reader needs from one row: `code` and optional `readAt`.
- **`useInboxNotices()`** — Returns a `ComputedRef<InboxNotice[]>` (newest first) by filtering `persistentMessages` for `meta.source === 'inbox'` and projecting `meta.notification`.
- **`registerNotices(notices)`** — Replaces (not appends to) the module-level `registeredNotices` map. Must be called by the composition root before any `noticeOf` lookup.
- **`noticeOf(code)`** — Looks up a single `AppNotice` entry by code; returns `undefined` if no enabled module declared that code.

## Relationships

- Imports `useNotificationsStore` from `@guebbit/vue-toolkit` (reads `persistentMessages` via `storeToRefs`).
- Imports the `AppNotice` type from `@/kernel/registry`.
- No other graph neighbors.

## Notes

- `registerNotices` is **replace** semantics; calling it twice means the second call wins entirely. Forgetting to call it at boot causes every notice to resolve as a generic, linkless entry.
- The kernel deliberately does **not** import `@/modules`; the composition root gathers notices (e.g. via `collectModuleNotices`) and installs them here.
- `noticeOf` returning `undefined` is expected for codes introduced by a newer backend that no local module yet declares—handle the `undefined` case at the call site.
