---
source: tests/unit/app/guards/locale-choice.spec.ts
sha256: ba1bb00ff81f97cc241da0ee3cd430569b8112648f755b51e1b332eaa06d54f2
generated_at: 2026-10-17T02:30:51.169413+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/guards/locale-choice.spec.ts

## Purpose

Unit tests for the locale router guard (`localeChoice`) and its underlying `fetchLanguageApi` helper. The guard runs on every navigation and must decide whether to proceed, load a missing locale, or redirect to inject a default — the test suite pins all three branches, the dictionary merge/override semantics, and a specific race condition where a slow in-flight language switch must not activate after a faster one has already taken over.

## Key elements

- **`i18nState`** — mutable object (`supportedLanguages`, `loadedLanguages`, `currentLocale`, `defaultLocale`) that individual tests reassign to control the i18n module's observable state.
- **`vi.mock('@/i18n')`** — replaces `supportedLanguages`/`loadedLanguages` with getters backed by `i18nState`; mocks `changeLanguage` and `updateLocale` as trackable `vi.fn` stubs.
- **`vi.mock('@api')`** — replaces `getLocales` and `getLocaleMessages` with `vi.fn` stubs that return `contractResponse`-wrapped payloads.
- **`routeTo(overrides?)`** — builds a minimal `RouteLocationNormalized` stub via `asStub` for guard inputs.
- **`describe('fetchLanguageApi')`** — asserts the always-resolve contract, bundled-dictionary loading, override-only fallback, network-failure tolerance, and deep-merge (override wins per-key without dropping siblings).
- **`describe('localeChoice')`** — asserts the three guard outcomes (return literal `true`, switch active language, redirect with preserved name/params/query) and the regression where a superseded in-flight switch must not activate.

## Relationships

- **`tests/support/stub.ts`** — supplies `asStub<T>`, used by the `routeTo` helper to produce type-safe, minimal `RouteLocationNormalized` objects without constructing full Vue Router internals.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `contractResponse` and the re-exported `@api/schemas` types (`GetLocalesResponse`, `GetLocaleMessagesResponse`) so mock API payloads satisfy the same contract shape the production client consumes.

## Notes

- **Literal `true` assertions**: Several tests use `expect(result).toBe(true)` rather than `.toBeInstanceOf(Boolean)` or truthiness checks. A redirect object is also truthy; returning one where `true` is expected creates an infinite navigation loop.
- **No `.catch()` by design**: `fetchLanguageApi` is documented to always resolve. Tests assert a resolved empty dictionary on failure paths (unsupported locale, rejected override fetch) rather than an awaited rejection.
- **Real dynamic import in tests**: The bundled-dictionary path (`import('@/locales/…json')`) is *not* mocked — only the API override tier is. This means the suite depends on at least one locale file existing under `src/locales/`.
- **Race-condition test** uses `Promise.withResolvers` to deterministically hold the `it` overrides fetch, let `es` activate first, then release `it` — proving the abandoned chain does not call `changeLanguage`.
- **`beforeEach`** resets `i18nState`, clears mocks, and clears `localStorage`; `afterEach` restores real timers.
