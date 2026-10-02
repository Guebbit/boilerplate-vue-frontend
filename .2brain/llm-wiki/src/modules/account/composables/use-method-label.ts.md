---
source: src/modules/account/composables/use-method-label.ts
sha256: d0ec4470865aa62007da634a66906cee8d2691edad17703fc71f1be808efba71
generated_at: 2026-10-02T12:14:16.691438+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-method-label.ts

## Purpose

Composable that turns a 2FA method's wire name (e.g. `'email'`, `'totp'`) into a human-readable label via i18n. It deliberately avoids branching on specific method names: if a locale key exists for the name it is used, otherwise the raw wire string is returned as-is, so a method added by a later deployment renders correctly with no code change here.

## Key elements

- **`useMethodLabel`** (exported) — composable entry point; calls `useI18n()` internally and returns `{ methodLabel }`.
- **`methodLabel(method: string): string`** — resolves the key `two-factor.method-${method}` through `i18n.te` (existence check) then `i18n.t` (translation); falls back to the raw `method` string when no key is found.

## Relationships

No graph neighbors are recorded for this file. Its sole external dependency is `useI18n` from `vue-i18n`.

## Notes

- The composable wraps `useI18n` rather than accepting `t`/`te` as parameters. The doc comment explains that `te` carries an implicit `this` in its method-shorthand signature, so destructuring it off the i18n instance would unbind it — hence it is always called as `i18n.te(...)`.
- The i18n key convention is `two-factor.method-<wireName>`. Adding a new method means adding a translation key; no code change in this file is required.
- The fallback is the raw wire string itself (e.g. `"sms"`), not a generic "Unknown method" message.
