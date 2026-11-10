---
source: src/modules/account/composables/use-password-strength.ts
sha256: 206371deea17bd7f849537099274f65db9cd44a20dbd8edece1eabdad0802fee
signature: 08ef22fabeef93d3165374c9d50a878dba5692dc77b387b9adc4dc4fe653bd3c
generated_at: 2026-11-10T03:24:19.015608+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-password-strength.ts

## Purpose

Composable that scores a password's strength locally via zxcvbn on every keystroke. It is deliberately separate from the breach-check composable so a page consuming only one never loads the other's dependencies. The score is purely advisory and must never gate form submission.

## Key elements

- **`usePasswordStrength(password: Ref<string>)`** — The sole export. Watches a reactive password ref, returns `{ score: Ref<0|1|2|3|4|undefined> }`. Score is `undefined` when the field is empty or before the zxcvbn chunk resolves.
- **`loadZxcvbn()`** (internal) — Lazy singleton that dynamically imports `@zxcvbn-ts/core`, `language-common`, and `language-en`, builds a single `ZxcvbnFactory` instance, and caches the promise. On failure it resets the cache so the next attempt retries.
- **`zxcvbnPromise`** (module-level) — Caches the in-flight or resolved factory promise; cleared on transient load errors.

## Relationships

- **`PasswordStrengthMeter.vue`** — Consumes `usePasswordStrength` to render the visual meter; passes its local password ref in and reads the returned `score` reactively.
- **`use-password-strength.spec.ts`** — Unit-tests the composable's scoring, empty-state, and race-condition behavior.

## Notes

- **Advisory only.** Components must treat a low score as a suggestion, never a blocking condition. The schema and server checks are the real gate.
- **Lazy loading.** The dynamic `import()` calls let Vite code-split zxcvbn (~few MB) into its own chunk; the signup page pays nothing until a password field is focused.
- **Race guard.** After awaiting `loadZxcvbn()`, the handler checks `password.value === candidate` before writing, discarding stale results if the user has already typed more or cleared the field.
- **Fire-and-forget.** The `.then().catch()` chain is intentionally unawaited inside the watcher; failures (e.g. offline) simply leave `score` at `undefined` with no visible error.
- **Not network-dependent.** Unlike its sibling `use-password-breach-check.ts`, this composable makes zero network calls and loads no breach data.
