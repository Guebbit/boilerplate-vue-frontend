---
source: src/modules/tasks/tests/task-kind.spec.ts
sha256: d0bb677e9365955d59ea084ae8f48b4b8d0fe0778dc06d5fc9066e1e9f3d34cd
signature: d0bb677e9365955d59ea084ae8f48b4b8d0fe0778dc06d5fc9066e1e9f3d34cd
generated_at: 2026-11-10T06:01:20.389102+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/task-kind.spec.ts

## Purpose
Unit tests for the `taskKindKey` helper, verifying that known `TaskKind` values map to their own locale key, unknown values fall back to a generic `task-kind.unknown` key, and that generic word exists in every shipped locale (en, it).

## Key elements
- **`describe('taskKindKey')`** – test suite around the single function under test.
- **`it.each(Object.values(TaskKind))`** – parametrized case asserting `taskKindKey(kind)` returns `task-kind.${kind}` for every enum member.
- **`it('falls back to the generic key…')`** – asserts an arbitrary string (`'kind_from_the_future'`) resolves to `'task-kind.unknown'`.
- **`it.each([['en', en], ['it', it_]])`** – confirms `locale['task-kind'].unknown` is truthy in each supported locale JSON.

## Relationships
- **`src/modules/tasks/task-kind.ts`** – the module under test; exports `taskKindKey`, the function whose behavior is asserted throughout this spec.

## Notes
- The unknown-kind case uses a string literal rather than a cast enum value, intentionally simulating a backend sending a new kind the frontend enum doesn't yet include.
- Locale files are imported as JSON modules (not via a runtime i18n library), so the assertion checks raw key existence, not rendered text.
