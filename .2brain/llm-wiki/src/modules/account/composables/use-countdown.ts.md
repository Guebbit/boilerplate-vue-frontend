---
source: src/modules/account/composables/use-countdown.ts
sha256: 6da2e3038373508e52cf85be262bc4ad55efa43f81e7da245f656451c7aa9595
generated_at: 2026-10-02T12:14:02.858758+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-countdown.ts

## Purpose

Provides a single "seconds remaining" countdown primitive plus two thin wrappers. A `setInterval` ticks a `now` ref while a deadline is active, and `secondsLeft` is derived from the server-provided deadline minus that clock — so the value always reflects the server's own expiry, never a client-guessed duration. The interval is created and torn down reactively, so it exists only while something is actually counting.

## Key elements

- **`useCountdown(deadline: Ref<number | undefined>)`** — Core composable. Watches the deadline (immediate, `flush: 'sync'`), starts a 1 s interval that refreshes an internal `now` ref, and exposes a computed `secondsLeft` (ceiling of remaining seconds, clamped to 0). Cleans up the interval on scope disposal. Calling `stop()` inside the computed when the deadline has passed halts the tick.
- **`useExpiryCountdown(expiresAt: Ref<string | undefined>)`** — Convenience wrapper: parses an ISO-8601 timestamp via `Date.parse` into epoch ms inside a computed, then delegates to `useCountdown`. Intended for API fields like a challenge's `expiresAt` or a delivered code's expiry.
- **`useCountdownAnnouncement(secondsLeft, message, expiredMessage)`** — Screen-reader companion. Watches `secondsLeft` and updates a `announcement` ref only when the value crosses one of the thresholds in `ANNOUNCEMENT_THRESHOLDS` (`[0, 10, 30, 60]`, ascending). Uses a non-reactive `announcedThreshold` local to prevent re-announcing the same band. `message` and `expiredMessage` are getters so a locale change mid-countdown is picked up at announcement time.
- **`ANNOUNCEMENT_THRESHOLDS`** — Module-level `as const` array. Ascending order is load-bearing: `Array#find` returns the first match `>=` the current second count, which only works correctly with an ascending list.

## Relationships

- **`src/modules/account/stores/two-factor.ts`** — The two-factor store consumes these composables for its UI: the login challenge countdown, the delivered-code expiry, and the resend cooldown all differ only in where the deadline value originates (server field vs. store-local state). The store owns the deadline refs; this file owns the ticking and announcement logic.

## Notes

- **`flush: 'sync'` is deliberate in two places.** Both the deadline watch in `useCountdown` and the `secondsLeft` watch in `useCountdownAnnouncement` use it. Without it, a default-queue watcher leaves one flush cycle reading a stale `now` — significant in a long-lived Pinia store where the scope outlives the initial render.
- **Side-effect in a computed.** `useCountdown`'s `secondsLeft` computed calls `stop()` when the remaining time hits zero. This is an intentional but unusual pattern (computed should be side-effect-free); it exists so the interval is torn down the instant the value is read rather than waiting for a separate watcher.
- **Announcement region is separate from the visible number.** The `role="status"` live region that `useCountdownAnnouncement` feeds must not wrap the on-screen ticking number, or a screen reader will read every second (WCAG/FA82 concern called out in the source).
- **`expiredMessage` is a function, not a string.** Pass a getter (e.g. `() => t('account.expired')`) so a mid-countdown locale switch is reflected when the announcement actually fires, not captured at setup time.
