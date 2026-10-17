---
source: src/modules/account/composables/use-countdown.ts
sha256: c31b31c37dcbe93ec1fa65b37590289d69d5467cc8d5a4f93123b09e4288b88c
generated_at: 2026-10-17T00:17:35.228979+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-countdown.ts

## Purpose

A single ticking "seconds left" primitive plus an ISO-timestamp wrapper. It derives the remaining seconds from a server-provided deadline (not a client-guessed duration), runs a `setInterval`-driven `now` ref only while a deadline is active, and provides an accessible announcement layer that fires at discrete thresholds rather than every tick.

## Key elements

- **`useCountdown(deadline: Ref<number | undefined>)`** — Core composable. Watches a reactive epoch-ms deadline, ticks `now` once per second via `setInterval`, and returns `{ secondsLeft }` (a `computed` clamped to ≥ 0). The interval is started/stopped as the deadline appears/disappears, and cleaned up on scope disposal.
- **`useExpiryCountdown(expiresAt: Ref<string | undefined>)`** — Thin wrapper that `Date.parse`s an ISO timestamp string and delegates to `useCountdown`. Used when the API spells deadlines as ISO strings.
- **`ANNOUNCEMENT_THRESHOLDS`** — `const [0, 10, 30, 60]` (ascending). The only second-marks at which `useCountdownAnnouncement` fires.
- **`useCountdownAnnouncement(secondsLeft, message, expiredMessage)`** — Returns `{ announcement }`, a `ref<string>` that holds the last threshold's text. Announces once per band crossing (60 → 30 → 10 → 0), never repeating while `secondsLeft` sits inside a band. `message` and `expiredMessage` are called with the threshold value, not the exact tick.

## Relationships

- **`TwoFactorChallenge.vue`** — Consumes `useExpiryCountdown` (or `useCountdown`) for the challenge's `expiresAt` and `useCountdownAnnouncement` for the screen-reader region.
- **`TwoFactorEnroll.vue`** — Consumes the same pair for a delivered enrollment code's own expiry timestamp.
- **`two-factor.ts` (store)** — Owns the resend-cooldown deadline ref; components pass that store ref into `useCountdown`. The composable is store-agnostic (it only needs a reactive `Ref`).
- **`Profile.vue`** — Uses the countdown for a time-limited action surfaced in the profile/account area.
- **`use-countdown.spec.ts`** — Unit tests for all three exports, including threshold-announcement logic and the stop-on-zero behavior.

## Notes

- **`flush: 'sync'` is load-bearing** on both the deadline watch and the announcement watch. A default (`'pre'`) watcher would leave one flush cycle reading a stale `now`, which matters when the owning scope is a long-lived store (minutes of drift otherwise).
- **Side effect inside `computed`:** when `secondsLeft` computes to ≤ 0 it calls `stop()` (clears the interval). This is intentional but unusual for a `computed`; tests should account for the interval no longer firing after that first zero read.
- **Thresholds are ascending** (`[0, 10, 30, 60]`) because `Array#find` returns the *first* match. A descending list would match 60 for every value ≥ 1 and never reach 30 or 10. Don't reorder.
- **`expiredMessage` is a getter** (not a string) so a locale change mid-countdown is picked up at the moment of expiry rather than captured at setup time.
- The announcement intentionally uses **bands** (`secondsLeft <= mark`) rather than exact equality, so a skipped tick (GC pause, background-tab throttling) still triggers the correct threshold.
