---
source: src/modules/account/tests/use-countdown.spec.ts
sha256: 89533246063f6f8bc304a7c26355007d9c4879a0af71b50eef7cf5c52a7ac614
signature: de2f7004fe37faff5c60b3e396e49d8d8afc9d087ed7ffb0b3bfd7ab876d2a52
generated_at: 2026-11-10T03:43:49.442726+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/use-countdown.spec.ts

## Purpose

Unit tests for the `useCountdownAnnouncement` composable. While `two-factor-store.spec.ts` exercises `useCountdown`'s ticking through the store, this file verifies the announcement layer directly: a screen reader should hear 60s, 30s, 10s, and "expired" — never every individual tick across a five-minute countdown.

## Key elements

- **`message(seconds)`** — test helper that formats a threshold as `"expires in {n}s"`, standing in for a real i18n callback.
- **`expiredMessage()`** — returns the literal string `"expired"`, standing in for translated copy.
- **`scope: EffectScope`** — created in `beforeEach`, stopped in `afterEach`; each test runs the composable inside it to isolate reactive effects.
- **`describe('useCountdownAnnouncement')`** — six test cases covering:
  - No announcement above the highest threshold (300s).
  - The 60s band: announced once at 60, held steady at 45 (no re-announcement).
  - Ordered passage through 60 → 30 → 10, each announced exactly once.
  - Expired state at 0: announced and held, does not flip back.
  - Skipped ticks (e.g. 65 → 25) still announce the nearest crossed threshold (30s).
  - Immediate announcement when the countdown starts already inside a band.

## Relationships

- **`src/modules/account/composables/use-countdown.ts`** — imports `useCountdownAnnouncement`, the sole production symbol under test. All assertions target its returned `announcement` ref.

## Notes

- The "band" semantics are the core contract: once a threshold is crossed, the announcement holds until the *next lower* threshold is crossed. Tests at 45s and 15s confirm no re-fire within a band.
- The skipped-tick test (65 → 25) guards against real-world GC pauses or tab throttling where the exact value 60 or 30 is never observed; the composable must still announce the nearest crossed threshold.
- `scope.run(...)` is used rather than a bare call so the composable's reactive effects are torn down deterministically in `afterEach`.
- This file intentionally does not test `useCountdown`'s ticking logic; that responsibility lives in `two-factor-store.spec.ts`.
