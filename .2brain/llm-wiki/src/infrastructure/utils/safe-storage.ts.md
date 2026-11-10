---
source: src/infrastructure/utils/safe-storage.ts
sha256: ceb88d8af319ebd3ca02a469acbdcd89718f5c98000d001123fba4c398858f4c
signature: 3352d412a6cc3c2f8a8a9762b967f21f9a6f5a642c61c0581fca7c97aa6b6b07
generated_at: 2026-11-10T03:13:25.933799+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/safe-storage.ts

## Purpose

Centralizes all Web Storage (`localStorage`/`sessionStorage`) and `JSON.parse` interactions behind a small set of helpers that **never throw**. Because blocked storage, full quota, and malformed JSON all manifest as exceptions, the `try/catch` logic lives here once, and every caller simply receives `undefined` or a silent no-op instead of handling errors.

## Key elements

- **`StorageKind`** — exported union type `'local' | 'session'` that selects the storage area.
- **`area`** (internal, not exported) — resolves a `StorageKind` to the corresponding `Storage` object.
- **`parseJsonSafe(raw: string): unknown`** — wraps `JSON.parse`; returns `undefined` on any parse failure.
- **`readJson(kind, key): unknown`** — reads one key from the given storage area, parses the result as JSON, returns `undefined` if the key is absent, the text isn't JSON, or storage is unavailable.
- **`writeJson(kind, key, value?)`** — serializes `value` to JSON and stores it, **or removes the key when `value` is `undefined`**. All failures are swallowed silently.
- **`removeByPrefix(kind, prefix)`** — iterates the named storage area and deletes every key that starts with `prefix`.

## Relationships

- **`tests/cross-cutting/module-map.spec.ts`** — a cross-cutting spec that asserts this file is accounted for in the project's module map. It does not exercise the helpers' runtime behavior.

## Notes

- **`writeJson` with `undefined` deletes the key.** It does not write the string `"undefined"`; it calls `removeItem`. Callers must pass `undefined` intentionally to clear a slot.
- **All exported functions are pure in their side-effect surface:** they either succeed silently or produce `undefined`/`void`. No error is ever propagated to the caller by design.
- **`area` is deliberately private.** External code must go through the public helpers so the "never throw" guarantee is enforced at a single choke point.
- **Eslint `no-restricted-syntax` is suppressed** at each `try/catch` site with a comment explaining *why* the throw is semantically "nothing saved" rather than a real failure. This is a project convention; do not remove the disable comments when refactoring.
- The file has **no runtime imports**; it relies solely on browser globals (`localStorage`, `sessionStorage`, `JSON`). It cannot be unit-tested without mocking those globals.
