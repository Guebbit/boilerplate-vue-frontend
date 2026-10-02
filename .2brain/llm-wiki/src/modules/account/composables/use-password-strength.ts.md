---
source: src/modules/account/composables/use-password-strength.ts
sha256: 0022e050a704772ce32e5610601c88ac118c73b2c29aee1373f5c6c966e8432b
generated_at: 2026-10-02T12:15:02.389820+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-password-strength.ts

## Purpose

Vue composable that scores a password field's strength locally via zxcvbn on every keystroke. It is strictly advisory (never blocks form submission) and is kept as a separate composable from the breach-check so a page that only needs one doesn't load the other's dependencies.

## Key elements

- **`usePasswordStrength(password: Ref<string>)`** — Exported composable. Accepts a reactive password ref, watches it (immediately), and returns `{ score: Ref<0|1|2|3|4 | undefined> }`. Score is `undefined` while the chunk is loading or the field is empty.
- **`loadZxcvbn()`** — Module-private. Dynamically imports `@zxcvbn-ts/core`, `language-common`, and `language-en`, instantiates a `ZxcvbnFactory`, and caches the resulting promise in a module-level variable so all fields on the page share one build. On rejection it resets the cache to `undefined` so the next call retries.
- **`zxcvbnPromise`** — Module-level cache (`Promise<ZxcvbnFactory> | undefined`).

## Relationships

No graph neighbors. The file's own header documents a deliberate separation from the sibling `use-password-breach-check.ts`: this composable never touches the network, and the breach check never loads zxcvbn's dictionaries, so each page pays for only what it uses.

## Notes

- **Code-splitting is intentional.** The `import()` calls cause Vite to emit zxcvbn as a separate chunk; a signup page shouldn't load it until a password field is actually focused.
- **Advisory contract.** Components consuming `score` must never treat it as a gate. The real validation gate is the schema plus server-side checks.
- **Race guard.** After the chunk resolves, the `.then` re-checks `password.value === candidate` to discard a stale result if the user has already typed more or cleared the field.
- **Transient-failure tolerance.** A failed chunk load (e.g. offline) simply leaves `score` at `undefined` — no error surfaces to the user, and the next keystroke retries the load.
- **Fire-and-forget.** The promise chain is `void`-prefixed; the composable never throws to the caller.
