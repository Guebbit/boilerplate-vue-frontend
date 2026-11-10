---
source: src/ui/organisms/dialog-width.ts
sha256: 0fd6655a552f51385b7450e2b98dd3b3cb12afadec53691a23e5c9682a6ab04f
signature: 4adadcff070838d6bdd012e74d09a5a29720351174f59b2f3b16568f0c341b35
generated_at: 2026-11-10T06:33:10.613777+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/dialog-width.ts

## Purpose

Defines the three named dialog-width tiers used across the app so each dialog declares *which* tier it is (e.g. `DIALOG_MAX_WIDTH.form`) rather than repeating a raw pixel value. It is deliberately **not** wired as a `VDialog` default, keeping the width choice explicit at every usage site.

## Key elements

- **`DIALOG_MAX_WIDTH`** (exported `const`) — An `as const` object with three px values:
  - `narrow` (420) — confirmation dialogs, single-question prompts
  - `form` (480) — short forms with a handful of fields
  - `wide` (640) — content-heavy dialogs (secrets, imports, long-value entries)

## Relationships

No graph neighbors are recorded for this file. It is a leaf module consumed directly by dialog components (bound as `:max-width="DIALOG_MAX_WIDTH.<tier>"`).

## Notes

- **Responsive:** The values apply from the `sm` breakpoint upward; on phones every dialog renders fullscreen regardless of tier.
- **Not a default:** If a dialog omits the `:max-width` binding, it falls back to the `VDialog` default (or none), not to one of these tiers. This is intentional — it forces each dialog to state its tier explicitly.
- **`as const`:** Values are literal types, so a misspelled key (e.g. `DIALOG_MAX_WIDTH.narow`) is a compile-time error.
