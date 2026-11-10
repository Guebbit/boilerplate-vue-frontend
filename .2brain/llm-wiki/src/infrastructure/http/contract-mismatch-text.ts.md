---
source: src/infrastructure/http/contract-mismatch-text.ts
sha256: 49e10afc1f06eff57dfc4c42853ebd91c3457885902c0f6c46ed948cc4123f6f
signature: 49e10afc1f06eff57dfc4c42853ebd91c3457885902c0f6c46ed948cc4123f6f
generated_at: 2026-11-10T03:02:51.001661+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/contract-mismatch-text.ts

## Purpose

A single-constant module that centralises the phrase every `[contract] … does not match the …` diagnostic emits. It exists so that the three producers (request/response validators, SSE client) and the Cypress e2e hook all agree on the exact wording without duplicating the string, and so a reword is a one-line change rather than a multi-file hunt.

## Key elements

- **`CONTRACT_MISMATCH_TEXT`** — exported `const` whose value is the literal string `'does not match the'`. Producers interpolate it into their diagnostic messages; the Cypress hook asserts on it.

## Relationships

- **`src/infrastructure/http/validate.ts`** — one of the producers; imports this constant to build its `[contract]` error strings.
- **`scripts/e2e/contract-mismatch.ts`** — the Cypress hook; imports this constant to match against the emitted text. This is the reason the file is kept import-free: the hook pulls in only this leaf module and nothing else of the application.

## Notes

- The file intentionally has **zero imports**. Do not add any—doing so would drag app modules into the Cypress bundle via the e2e hook.
- The constant is a *substring* (`'does not match the'`), not a full sentence. Producers surround it with their own subject/object text (e.g. `[contract] body does not match the schema`).
- If the wording of the contract diagnostic changes, update this one export; the hook and all producers will follow automatically.
