---
source: tests/unit/app/guards/locale-choice.spec.ts
sha256: 489b2d411a7f15285caa6f890f40656ba4a720d317c4a48a1cb35b041a6babcf
signature: 0c97878102d7d6e879439104147b8eca25bcfd833fe835182292aba1747088f7
generated_at: 2026-11-10T07:46:05.266992+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/guards/locale-choice.spec.ts

## Purpose

Unit tests for the locale router guard (`localeChoice`) and its underlying dictionary loader (`fetchLanguageApi`). The guard must pick exactly one of three outcomes per navigation — proceed, load-then-proceed, or redirect — and a wrong pick (especially returning a redirect when it should return `true`) causes an infinite navigation loop. The suite also pins the merge contract: bundled dictionary first, per-key overrides on top, and a hard guarantee that `fetchLanguageApi` always resolves, never rejects.

## Key elements

- **`i18nState`** — mutable plain object (`supportedLanguages`, `loadedLanguages`, `currentLocale`, `defaultLocale`) that backs the `vi.mock('@/i18n')` getters; each test mutates it to control what the i18n runtime "reports."
- **`changeLanguageMock` / `updateLocaleMock`** — `vi.fn` spies standing in for the i18n runtime's language-switch and dictionary-registration calls.
- **`getLocalesMock` / `getLocaleMessagesMock`** — stubs for the `@api` locale endpoints (`listLocales`, `getLocaleMessages`), returning valid `contractResponse` payloads.
- **`routeTo(overrides?)`** — helper that wraps `asStub<RouteLocationNormalized>` to build a minimal route the guard can read (`name`, `params`, `query`).
- **`describe('fetchLanguageApi')`** — five cases: unsupported locale → empty dict; supported with bundled file → non-empty dict; supported without bundled file → overrides only; API failure → bundled half still resolves; deep-merge of a nested key without dropping siblings.
- **`describe('localeChoice')`** — nine cases covering: already-loaded-and-active → literal `true`; loaded-but-different → `true` + `changeLanguage`; supported-unloaded → `true` + `updateLocale` then `changeLanguage`; unsupported → redirect preserving name/params/query; case-insensitive match → redirect to canonical spelling; canonical spelling passes through (no loop); missing locale param → redirect to default; redirect side-effect isolation (no language activation); concurrent-navigation regression.

## Relationships

- **`tests/support/stub.ts`** — provides `asStub`, used by `routeTo` to build a type-safe partial `RouteLocationNormalized` without hand-writing a full route object.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `contractResponse`, which wraps raw fixture data into a response shape that satisfies the generated `@api/schemas` types (`ListLocalesResponse`, `GetLocaleMessagesResponse`).

## Notes

- The `@/i18n` mock uses **getters** bound to `i18nState`, so tests can change `supportedLanguages` / `loadedLanguages` per-case without re-mocking. This keeps the suite independent of whatever JSON files exist in `src/locales/`.
- The `@api` mock sits at the **network boundary** (stubbing `listLocales` / `getLocaleMessages`), deliberately *not* at `withLocaleOverrides`. This means the per-key deep-merge logic inside the guard is actually executed and asserted, rather than replaced.
- Every "no dictionary" path asserts a **resolved empty object**, not a rejection, because `fetchLanguageApi`'s contract is always-resolve; callers have no `.catch()`.
- The guard's pass-through branches are asserted with `toBe(true)` (strict identity), not `toBe(true)` via truthiness, to catch a redirect object that would otherwise slip through as "truthy" and loop.
- The guard under test is loaded via a top-level `await import(...)` *after* all `vi.mock` calls, ensuring the mocks are in place before the module is evaluated.
