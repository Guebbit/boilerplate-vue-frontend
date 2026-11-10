---
source: src/modules/products/release-date.ts
sha256: 944b63f2210e6de89ab6864f6b5a7b9a5c3a89fc3a13d9f715c689c08c6be6fa
signature: 99a5973b2a9f17980ab190cbf1b52accffc655dd96464179e1b64c7b65e90e64
generated_at: 2026-11-10T05:21:24.923708+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/release-date.ts

## Purpose

Canonical helpers for the product release-date field, treating it exclusively as a `YYYY-MM-DD` day string (the same format the wire and `<input type="date">` share). No parsing, no timezone math — the server owns midnight conversion. The module exists so the "did the day actually move?" and "what goes in the PATCH?" questions have one implementation.

## Key elements

- **`isReleaseDateChanged(original, next): boolean`** — Normalises `null`/`undefined` to `''` on both sides, then returns whether the two day strings differ. Used to decide if a save is a no-op for the day.
- **`dayChange(held, current): string | undefined`** — Returns `''` when the field is being cleared, the new day string when it genuinely changed, or `undefined` to omit the field from the PATCH body entirely. Delegates the comparison to `isReleaseDateChanged`.

## Relationships

- **`src/modules/products/composables/use-release-date-confirm.ts`** — Consumes these helpers (or the same "day-moved?" semantics) to gate the buyer-impact preview before a save is dispatched.
- **`src/modules/products/views/ProductEdit.vue`** — Calls `dayChange` when assembling the PATCH payload so an untouched release date is never resent (and therefore never triggers a buyer notification).
- **`src/modules/products/tests/release-date.spec.ts`** — Unit-tests both exports, including the `null`/`undefined`/`''` equivalence and the `undefined`-omits-from-patch contract.

## Notes

- `null`, `undefined`, and `''` are all treated as "no date set." Do not introduce a `Date` object or a `YYYY-MM-DD HH:mm:ss` value here; the module contract is day-string-only.
- `dayChange` returning `undefined` is intentional: the PATCH builder skips `undefined` keys, so the field is left untouched server-side. Returning `''` is the explicit "clear it" signal.
- The module deliberately does **not** count affected buyers. That concern lives server-side (`release-date-impact`); the only client-side question answered here is "did the string change?"
