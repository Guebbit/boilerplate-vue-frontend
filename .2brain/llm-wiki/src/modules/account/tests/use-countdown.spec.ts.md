---
source: src/modules/account/tests/use-countdown.spec.ts
sha256: 5485368279ee5d93de4a601983991342c99710d6ed5605b572fb9987ceedff58
generated_at: 2026-10-02T12:33:34.234194+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-countdown.spec.ts

## Purpose

Vitest spec for `useCountdownAnnouncement` (FA82), a screen-reader accessibility helper that announces countdown milestones (60s, 30s, 10s, expired) exactly once per threshold crossing rather than on every tick. The file explicitly does **not** test `useCountdown`'s own ticking logic; that is covered by `two-factor-store.spec.ts`.

## Key elements

- **`message(seconds)` / `expiredMessage()`** – Minimal i18n-shaped callbacks passed into the composable so tests can assert on the announcement string without a real locale layer.
- **`scope` (EffectScope)** – Created in `beforeEach`, stopped in `afterEach`; every `useCountdownAnnouncement` call is run inside it so reactive effects are torn down between tests.
- **`describe('useCountdownAnnouncement')`** – Six test cases covering:
  - Silence when `secondsLeft` is above the highest threshold (300).
  - The 60s band: announcement appears at 60 and *persists* at 45 (no re-fire on intermediate ticks).
  - Sequential crossing of 60 → 30 → 10 in order, each announced once.
  - Expired state at 0 and idempotency (staying at 0 doesn't flip back).
  - Skipped-tick resilience: jumping from 65 straight to 25 still announces the 30s threshold.
  - Immediate announcement when the initial value is already inside a band (e.g. starts at 30).

## Relationships

No graph neighbors are recorded for this file. It imports `useCountdownAnnouncement` from `@/modules/account/composables/use-countdown.ts` and standard Vitest/Vue test utilities, but no other project files are linked in the dependency graph.

## Notes

- The core invariant under test is **threshold-crossing semantics**, not tick-by-tick correctness. The composable must announce the *nearest threshold that has been crossed or reached*, not the exact current value.
- The "skipped tick" test (65 → 25) guards against real-world stalls (GC pauses, backgrounded tabs) where the exact value 60 or 30 is never observed; the announcement must still fire for the most recent threshold passed.
- The file references `two-factor-store.spec.ts` as the owner of `useCountdown` ticking tests — do not add ticking assertions here.
- Tests use a `ref` for `secondsLeft` and mutate it directly; no Vue component rendering is involved, so `effectScope` (not `mount`) is the appropriate cleanup mechanism.
