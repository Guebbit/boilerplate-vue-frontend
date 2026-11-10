---
source: src/modules/products/tests/use-translated-entity-form-baseline.spec.ts
sha256: 9cd65c80f47cbdb0d2c334ce14e607a69a6c16d8b1917417fda46a240d98d6f2
signature: 9e9fc29b327cdf301dd7713209e6cecc0533dd2a5eea9fc8859cfa8c6ec420a5
generated_at: 2026-11-10T05:32:48.320659+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/use-translated-entity-form-baseline.spec.ts

## Purpose

Vitest spec for the `useTranslatedEntityForm` composable, focused on one scenario: the fallback language arrives *after* mount (simulating a delayed `GET /locales`). It verifies that seeding the fallback tab into an untouched form does **not** flip `isDirty`, that typing into the seeded tab does, and that an already-dirty form's baseline is not re-anchored.

## Key elements

- **`PriceForm`** (interface) — minimal form shape (`price` + per-locale `title`/`description`) used by both product forms.
- **`mountForm(fallback?)`** — mounts a headless host component that calls `useTranslatedEntityForm<PriceForm>` with `seedFallback: true`, a Zod schema, and stub callbacks; returns `{ form, fallback }` for assertions.
- **`noReport`** / **`renderNothing`** — no-op stubs to satisfy the composable's required parameters without side effects.
- **Three `it` blocks** (under `describe('useTranslatedEntityForm — the seeded fallback tab')`):
  1. Fallback arrives on an empty form → `isDirty` stays `false`, translations contain only the seeded key.
  2. Visitor types into the seeded tab → `isDirty` becomes `true`.
  3. Form was already edited before fallback arrives → baseline does not shift; `isDirty` remains `true`.

## Relationships

- **`src/modules/products/composables/use-translated-entity-form.ts`** — the unit under test. The spec imports `useTranslatedEntityForm`, instantiates it with a `PriceForm`-typed config, and asserts on its returned `form` and `isDirty` refs.

## Notes

- The host component renders nothing (`renderNothing` returns `null`); the spec reads composable state directly, so DOM assertions are absent.
- `fallback` is a `ref` injected at mount time and mutated *after* mount to simulate an async locale lookup — this timing is the entire point of the spec.
- `formElement: () => undefined` and `reportSubmitError: noReport` are throwaway stubs; they exist only to satisfy the composable's parameter contract and have no test-relevant behavior.
