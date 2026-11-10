---
source: tests/unit/infrastructure/tour-seen.spec.ts
sha256: 4acf3ad6daacf5135a2a677d856884cacdfde0d2f412a194a89252a96ba7eb86
signature: 4acf3ad6daacf5135a2a677d856884cacdfde0d2f412a194a89252a96ba7eb86
generated_at: 2026-11-10T08:04:17.413212+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/tour-seen.spec.ts

## Purpose

Unit tests (Vitest) for the `tour-seen` infrastructure module. They verify the key-generation scheme, the localStorage-backed "already seen" record (capping, deduplication, expiry), and that malformed or damaged stored data degrades gracefully rather than throwing.

## Key elements

- **`tourSeenKey` tests** — confirm the key is a function of account id, tour name, and version; confirm a missing account (guest) produces the literal `'guest:…'` prefix instead of an account id.
- **`markTourSeen` / `hasSeenTour` tests** — cover:
  - Per-key isolation (marking one key doesn't affect others).
  - Version bump resets "seen" state.
  - Adding a new key preserves existing ones; re-adding the same key doesn't duplicate.
  - Cap enforcement: after 45 inserts the oldest key is evicted (capacity = 44).
  - Corrupted JSON in `localStorage` (`'toursSeen'`) is read as empty; subsequent writes work.
  - Structurally invalid records (non-array `keys`, missing `savedAt`, non-object root) are ignored without throwing.
  - Six-month (≈ 183-day) expiry measured from the record's `savedAt`; a new write resets the clock for *all* existing keys.
- **`beforeEach`** — clears `localStorage` before every test for isolation.

## Relationships

No graph neighbors are registered for this file.

## Notes

- The expiry test uses a raw millisecond offset (e.g. `182 * day`, `184 * day`) rather than mocking `Date`/`Date.now`; the module under test must accept a `now` parameter for this to work.
- The cap test hard-codes 45 iterations to assert a capacity of 44 — if the cap constant changes upstream, this test breaks.
- The `localStorage` key name `'toursSeen'` is asserted directly in the "damaged record" and "malformed record" tests, coupling the spec to that exact storage key.
- Guest keys use the literal `'guest'` string as the account segment; any change to that sentinel will break the `tourSeenKey` guest test.
