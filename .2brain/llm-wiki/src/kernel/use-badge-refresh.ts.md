---
source: src/kernel/use-badge-refresh.ts
sha256: 3e4ef4971514d668d82e9be012a0a617609a9c5a261bfb0ceaa8eaa23f1c7603
signature: 7de7669bd528f376a00bfb5b659e3b4b076c09adf174aa049a0939534e2bf316
generated_at: 2026-11-10T03:17:26.893889+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/use-badge-refresh.ts

## Purpose

Composable that wires event-driven refresh triggers to a single staff navigation badge's count read. It replaces timer-based polling: the badge re-reads only when the person moves (route change, tab regain), the viewer changes, or a new staff notice arrives. It also enforces a once-per-outage error notification while keeping the last known count.

## Key elements

- **`BADGE_FRESH_MS`** (`60_000`) — exported constant; the `staleTime` (in ms) that normal (non-forced) reads pass to their cache layer so a re-read within a minute is deduplicated.
- **`BadgeRefreshOptions`** — exported interface the badge implements: `readerId` (signed-in id or `undefined`), `read(forced)` (perform the count read), `clear()` (forget the count).
- **`STAFF_NOTICE_MARKER`** (`'.staff.'`) — internal constant; substring used to distinguish staff-work notices from buyer messages in the inbox bell.
- **`useBadgeRefresh(options)`** — the exported composable (call in `setup`). Sets up three Vue watchers (`readerId`, `route.path`, `staffNoticeCount`) and a `visibilitychange` listener, all funneled through a failure-safe `refresh(forced)` helper.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — transitive dependency (reached via `useAmbientError` from the same `infrastructure/utils` directory). When a read fails and the `warned` flag is unset, `onAmbientError(error)` is called, which ultimately reports through the logger.

## Notes

- **`flush: 'post'` on the `readerId` watcher** — deliberate: the read fires *after* the session layer has already reset per-person state, so the request lands on a clean store. Removing this flag would race the reset.
- **No timer exists.** All refreshes are triggered by discrete events (route, visibility, viewer, notice count). Do not add a `setInterval` here.
- **`warned` is a closure-local boolean**, not reactive state. It suppresses repeated ambient-error toasts for consecutive failures and resets to `false` on the next successful read.
- **The `visibilitychange` listener is managed manually** (`addEventListener` / `removeEventListener` in `onScopeDispose`) rather than via a Vue directive; ensure any refactor preserves the cleanup.
- **`staffNoticeCount` is a computed**, but the watcher only acts on *increments* (`now > before`). A notice being dismissed or filtered out will not trigger a read.
