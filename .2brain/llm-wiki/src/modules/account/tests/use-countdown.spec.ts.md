---
source: src/modules/account/tests/use-countdown.spec.ts
sha256: 89533246063f6f8bc304a7c26355007d9c4879a0af71b50eef7cf5c52a7ac614
generated_at: 2026-10-17T00:28:10.265463+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-countdown.spec.ts

## Purpose

Unit tests for `useCountdownAnnouncement`, the screen-reader-friendly subset of the countdown composable. Where the store spec (`two-factor-store.spec.ts`) already exercises the raw ticking, this file verifies that announcements fire exactly once per threshold crossing (60s → 30s → 10s → "expired") and never on every individual tick of a multi-minute challenge.

## Key elements

- **`message` / `expiredMessage`** – Minimal stand-ins for the i18n callbacks passed into the composable; they return fixed strings (`"expires in 60s"`, `"expired"`) so assertions stay readable.
- **`scope: EffectScope`** – Per-test Vue effect scope created in `beforeEach` and stopped in `afterEach`, ensuring reactive watchers inside the composable are torn down between tests.
- **`describe('useCountdownAnnouncement')`** – Six test cases covering:
  - No announcement above the highest threshold.
  - 60s band: announced once, held for the remainder of the band.
  - Sequential 60 → 30 → 10 crossings, each announced exactly once.
  - "Expired" state at 0 and its stickiness.
  - Threshold skip (e.g. 65 → 25): nearest *crossed* threshold is announced.
  - Initial state already inside a band (starts at 30s): announces immediately.

## Relationships

- **`src/modules/account/composables/use-countdown.ts`** – The sole production import. The test calls `useCountdownAnnouncement(secondsLeft, message, expiredMessage)` via `scope.run` and asserts on the returned `announcement` ref. No other module in the account area is touched here.

## Notes

- The "skip a tick" test (65 → 25) documents a real production concern: a GC pause or background-tab throttle can make `secondsLeft` jump over an exact threshold value. The composable must still announce the nearest *crossed* band rather than staying silent.
- Tests drive `secondsLeft` manually (no fake timers), so timing precision is irrelevant; only the reactive comparison logic under test matters.
- The module-level doc comment explicitly delegates raw-tick coverage to `two-factor-store.spec.ts`; don't duplicate ticking assertions here.
