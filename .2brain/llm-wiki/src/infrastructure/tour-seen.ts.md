---
source: src/infrastructure/tour-seen.ts
sha256: 6d804f632c12bb8730671ac79a143fb99d1ddd7d5817227aa26a3b780dff6ab6
signature: 9d9b4542ab0cc74f1f6bbdd306eaf9cc3b57007e7c89e6553e65814a15a271df
generated_at: 2026-11-10T03:10:38.912642+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/tour-seen.ts

## Purpose

Persists, per browser, which guided tours have already been shown so they are not replayed on every visit. Stores a single JSON record (`{ savedAt, keys }`) in `localStorage`; the record self-expires after six months and is capped at 40 keys to stay small across multiple accounts.

## Key elements

- **`tourSeenKey(accountId, tourId, version)`** – Builds the composite key string `accountId:tourId:version`. Uses `'guest'` when `accountId` is `undefined`. Bumping `version` produces a new key, re-showing the tour.
- **`hasSeenTour(key, now?)`** – Returns whether the key is already in the stored record. A missing, expired, or corrupt record yields an empty key list, meaning the tour will show again.
- **`markTourSeen(key, now?)`** – Adds the key to the record (deduplicating), keeps only the newest `MAX_KEYS` (40) entries, stamps `savedAt`, and writes the record back.
- **`readKeys` (internal)** – Reads and validates the `localStorage` record; returns `[]` for any malformed, expired, or type-mismatched data.
- **`STORAGE_KEY`** – Resolved from `BROWSER_STORAGE_NAME.toursSeen` in `browser-storage.ts`.
- **`MAX_AGE_MS`** – Six months, derived from `SIX_MONTHS_DAYS`.

## Notes

- Both "finished" and "skipped" count as seen; the caller decides when to call `markTourSeen`.
- `now` is an injectable parameter (defaulting to `Date.now()`) on both public functions, enabling deterministic testing.
- A corrupt or expired record is silently treated as empty—no error is surfaced; the cost is simply re-showing a tour.
- The record is per-browser, not per-user: a new device will replay all tours regardless of what other devices have seen.
- No user consent is required because it is classified as a remembered interface preference.
