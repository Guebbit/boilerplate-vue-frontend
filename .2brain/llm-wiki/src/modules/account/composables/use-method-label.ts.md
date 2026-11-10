---
source: src/modules/account/composables/use-method-label.ts
sha256: d0ec4470865aa62007da634a66906cee8d2691edad17703fc71f1be808efba71
signature: 6483cfe8b0446f28304697256375d4e84f9373e30838e98ab5f9867323e8a0f1
generated_at: 2026-11-10T03:24:01.311811+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-method-label.ts

## Purpose

Provides a single composable that resolves a 2FA method's wire name (e.g. `'email'`, `'totp'`) into display copy via `vue-i18n`, falling back to the raw string when no locale key exists. This keeps the codebase agnostic to which methods a particular deployment supports—new methods like `sms` become readable without touching this file.

## Key elements

- **`useMethodLabel()`** — The sole export. Calls `useI18n()` internally and returns `{ methodLabel }`.
- **`methodLabel(method: string): string`** — Builds the key `` `two-factor.method-${method}` ``, checks existence with `te()`, translates with `t()` if present, otherwise returns `method` unchanged.

## Relationships

- **`src/modules/account/components/ProfileTwoFactor.vue`** — Consumes `useMethodLabel` to render each configured 2FA method's display name in the profile list.
- **`src/modules/account/views/TwoFactorChallenge.vue`** — Consumes `useMethodLabel` to label the method being challenged.
- **`tests/cross-cutting/module-map.spec.ts`** — References this file as part of the account module's expected module map.

## Notes

- `te` / `t` are called on the `i18n` composer object (e.g. `i18n.te(key)`) rather than destructured. Destructuring would strip the implicit `this` binding that `te`'s method-shorthand signature relies on.
- The composable wraps `useI18n` so call sites never see the i18n dependency directly; passing `t`/`te` as arguments was the rejected alternative.
- The fallback to the raw wire string is a deliberate extension point, not a bug: it means an unrecognised method still displays *something* legible.
