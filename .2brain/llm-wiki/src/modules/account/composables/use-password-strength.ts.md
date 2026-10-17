---
source: src/modules/account/composables/use-password-strength.ts
sha256: 206371deea17bd7f849537099274f65db9cd44a20dbd8edece1eabdad0802fee
generated_at: 2026-10-17T00:17:43.957116+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-password-strength.ts

## Purpose

Provides a reactive, client-side password strength score (0–4) using zxcvbn, scored locally on every keystroke. It is deliberately separate from the breach-check composable so that pages needing only one feature never load the other's dependencies. The score is strictly advisory and must never gate form submission.

## Key elements

- **`loadZxcvbn()`** (internal) — Resolves a single shared `ZxcvbnFactory` instance on first call. Uses dynamic `import()` for `@zxcvbn-ts/core`, `language-common`, and `language-en` so Vite emits a separate lazy-loaded chunk. Caches the promise in a module-level `zxcvbnPromise`; on rejection it resets to `undefined` so the next keystroke retries.
- **`usePasswordStrength(password: Ref<string>)`** (exported) — Watches the given password ref (`immediate: true`). For a non-empty candidate, fire-and-forget loads zxcvbn, calls `.check(candidate).score`, and writes to a reactive `score` ref (typed `0|1|2|3|4 | undefined`). Guards against stale writes by comparing `password.value === candidate` before assigning. Returns `{ score }`.

## Relationships

- **`PasswordStrengthMeter.vue`** — Consumes the reactive `score` returned by `usePasswordStrength` to render the visual strength meter in the account/password UI.
- **`use-password-strength.spec.ts`** — Unit tests for the composable (score transitions, empty-field reset, failure resilience, stale-keystroke guard).

## Notes

- The score is advisory only; the composable's JSDoc explicitly warns consumers must not block submission on it.
- `score` is `undefined` for an empty field *and* until the zxcvbn chunk has resolved — consumers should treat `undefined` as "no data" rather than "weak."
- The zxcvbn instance is a module-level singleton; all password fields on any page share one build. This also means a transient network failure (offline) silently leaves the meter blank rather than crashing.
- The `catch(() => undefined)` inside the watch callback swallows chunk-load errors by design — there is no retry loop, just "next keystroke retries via the reset promise."
