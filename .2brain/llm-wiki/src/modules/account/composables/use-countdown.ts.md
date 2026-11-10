---
source: src/modules/account/composables/use-countdown.ts
sha256: c31b31c37dcbe93ec1fa65b37590289d69d5467cc8d5a4f93123b09e4288b88c
signature: cdb391443e90ecd02a15a76a9e85066815f189b50933d51c3ed9d7a257d525f1
generated_at: 2026-11-10T03:23:51.876432+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-countdown.ts

## Purpose

A single ticking "seconds left" primitive whose value is always derived from a server-provided deadline (epoch-ms or ISO timestamp), never from a client-guessed duration. The `setInterval` exists only while a deadline is active, so idle components carry no timer. Used across the account module for challenge expiries, delivered-code expiries, and resend cooldowns.

## Key elements

- **`useCountdown(deadline: Ref<number | undefined>)`** — Core composable. Accepts a reactive epoch-ms deadline; returns `{ secondsLeft }`, a `ComputedRef<number>` that ticks once per second down to `0`. Internally maintains a `now` ref refreshed by a `setInterval`, started/stopped reactively via a `flush: 'sync'` watcher on `deadline`. Cleans itself up on scope disposal.
- **`useExpiryCountdown(expiresAt: Ref<string | undefined>)`** — Thin adapter: parses an ISO string with `Date.parse` inside a `computed` and delegates to `useCountdown`. This is the entry point for any API field spelled as an ISO timestamp (such as a challenge's `expiresAt`).
- **`useCountdownAnnouncement(secondsLeft, message, expiredMessage)`** — Screen-reader companion. Watches `secondsLeft` and updates a single `announcement` ref only when the value crosses one of the thresholds in `ANNOUNCEMENT_THRESHOLDS` (`0, 10, 30, 60`). Intended for a `role="status"` live region *separate* from the visible ticking number.
- **`ANNOUNCEMENT_THRESHOLDS`** — Ascending `[0, 10, 30, 60]` const array. Ascending order is load-bearing: `Array#find` picks the first mark `>=` the current second, which only works correctly when the list is sorted low-to-high.

## Relationships

- **`src/modules/account/views/TwoFactorChallenge.vue`** — Consumes `useExpiryCountdown` with the challenge's `expiresAt` ISO string; also feeds the resulting `secondsLeft` into `useCountdownAnnouncement` for its live region.
- **`src/modules/account/components/TwoFactorEnroll.vue`** — Uses `useExpiryCountdown` for the delivered verification code's own expiry timestamp.
- **`src/modules/account/stores/two-factor.ts`** — Owns a resend-cooldown deadline (epoch ms) and calls `useCountdown` directly; the store's long-lived scope is the "drift" case the `flush: 'sync'` watch addresses.
- **`src/modules/account/views/Profile.vue`** — Renders countdown output for account-related timers via the exported composables.
- **`src/modules/account/tests/use-countdown.spec.ts`** — Unit tests covering tick behaviour, threshold announcements, cleanup on scope dispose, and the ISO-parsing adapter.

## Notes

- **`flush: 'sync'` is intentional and load-bearing** in both the `deadline` watcher and the `secondsLeft` watcher. A default (pre/queue) flush would let one render cycle read a stale `now`, producing a one-second drift — significant for the long-lived store case. Do not "simplify" this away.
- **`secondsLeft` uses `Math.ceil`**, so the displayed value is always ≥ 0 and never rounds a 999 ms remainder down to 0 early.
- **The interval is stopped inside the `computed`** when `remaining <= 0`. This means the `computed` has a side effect (clearing the interval); it is safe because `stop()` is idempotent, but it means the computed is *not* a pure derivation.
- **`announcedThreshold` is a plain `let`, not a `ref`.** It is read-and-written only inside the watcher callback and never rendered, so reactivity is unnecessary. Don't convert it to a `ref` "for consistency" — it would trigger extra reactivity cycles.
- **The announcement is a *band*, not an exact hit.** If a tab stall skips from 65 s to 25 s, the 30 s band is still announced once. The visible number will jump; the announcement will not.
- **`expiredMessage` is a getter (function), not a pre-computed string**, so a locale switch mid-countdown is picked up at announcement time rather than captured at setup.
