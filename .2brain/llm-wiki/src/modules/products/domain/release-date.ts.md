---
source: src/modules/products/domain/release-date.ts
sha256: de5cc373afbf2d845a4c75308d3c879a17f85302c4991805e5e49109a4327bcb
generated_at: 2026-10-17T01:28:04.345394+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/domain/release-date.ts

## Purpose

Pure conversion helpers between the wire's ISO 8601 UTC instant and the zone-less `YYYY-MM-DDTHH:mm` string that a `<input type="datetime-local">` reads and writes. They exist so the Vue product forms can bind a native date picker without each view reimplementing the two-way translation.

## Key elements

- **`toDateTimeLocal(iso?: string | null): string`** — Converts an ISO 8601 instant (or `undefined`/`null`/`''`) into the `datetime-local` wall-clock spelling in the browser's local zone, minute precision. Returns `''` when the input is absent or unparseable.
- **`fromDateTimeLocal(local?: string | null): string`** — Converts the `datetime-local` string back to a UTC ISO 8601 instant via `Date#toISOString()`. Returns `''` for empty/unreadable input.
- **`pad(part: number): string`** — (private) Left-pads a numeric date part to two digits; used internally by `toDateTimeLocal`.

## Relationships

- **`src/modules/products/domain/index.ts`** — Re-exports both functions as part of the products domain barrel, making them importable without the full path.
- **`src/modules/products/tests/release-date.spec.ts`** — Unit-tests both converters, including edge cases (empty, `null`, malformed strings).
- **`src/modules/products/views/ProductCreate.vue`** — Calls `fromDateTimeLocal` to serialize the form field into the request body on creation.
- **`src/modules/products/views/ProductEdit.vue`** — Calls `toDateTimeLocal` to populate the picker from the loaded product, and `fromDateTimeLocal` on save.

## Notes

- An empty-string return (`''`) is the sentinel for "no value." Downstream body helpers interpret it as `null` (clear) on edit or omit the field entirely on create — the functions themselves never emit `null`.
- `fromDateTimeLocal` relies on the ECMAScript spec behavior that a single-argument `new Date('YYYY-MM-DDTHH:mm')` is parsed as **local** time; the resulting ISO string is therefore UTC. This asymmetry (local → UTC on the way out, UTC → local on the way in) is intentional and matches what a user expects from a date picker.
- The module is side-effect-free (`@module`); safe to import in any layer.
