---
source: src/modules/returns/domain/statement.ts
sha256: 2f4c23de949a737a1f228b76de45c842ef5086cbc632562e422e16da7338a57e
signature: b46e9e846fcbb09593dfeee8feddc526d645be7f6971f1c95f888acef79905ad
generated_at: 2026-11-10T05:37:50.255667+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/domain/statement.ts

## Purpose

Domain helpers that convert between the browser's `datetime-local` wall-clock string and the UTC ISO instant the API expects, validate that a stated moment is not in the future, and provide the channel enum values plus a type guard for the staff statement channel. Three return forms share these utilities so the conversion and validation logic lives in one place.

## Key elements

- **`STATEMENT_CHANNELS`** — `StaffStatementChannel` enum values in the order the UI select lists them.
- **`toLocalInput(at: Date)`** — Formats a `Date` as `YYYY-MM-DDTHH:mm` using local-time getters (the shape a `<input type="datetime-local">` expects).
- **`localToIso(local: string)`** — Parses the field's string into a `Date` and returns `toISOString()`; returns `undefined` for empty or unparseable input.
- **`isStatedInTime(local, now?)`** — Returns `true` when the value is parseable and not in the future. Accepts an injectable `now` for testing.
- **`isStatementChannel(value: string)`** — Type guard (`value is StaffStatementChannel`) backed by an internal `ReadonlySet` for O(1) lookup.
- **`two`** *(internal)* — Pads a number to two digits; used by `toLocalInput`.

## Relationships

- **`StatedAtFields.vue`** — Consumes `toLocalInput`, `localToIso`, `isStatedInTime`, `STATEMENT_CHANNELS`, and `isStatementChannel` to render and validate the "stated at" date/channel pair.
- **`CancelRemainderDialog.vue`**, **`RecordWithdrawalDialog.vue`**, **`ReturnRequestForm.vue`** — The three forms referenced in the module doc; they import these helpers (directly or via `StatedAtFields.vue`) to keep conversion consistent.
- **`src/modules/returns/tests/statement.spec.ts`** — Unit tests for the conversion and validation functions, likely exercising `localToIso` round-trips, empty-string handling, and the `isStatedInTime` boundary.

## Notes

- `toLocalInput` → `localToIso` is **not** a strict inverse: `toLocalInput` reads local-time components, while `localToIso` produces a UTC ISO string. A round-trip through `Date` will still work, but the intermediate string is local and the output is UTC.
- `localToIso` treats an empty string as "nothing was typed" and returns `undefined` rather than throwing, so callers can conditionally include the field.
- `isStatedInTime` defaults `now` to `new Date()` but accepts an explicit instant, making the future-boundary test deterministic in `statement.spec.ts`.
- The module is pure (no side effects, no DOM access), which is why it lives under `domain/` rather than `components/`.
