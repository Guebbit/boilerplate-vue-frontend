---
source: tests/unit/infrastructure/locale-overrides.spec.ts
sha256: 6b8baaf9b28eb3eaf07ab0116eb0d60a136fe55b926eeae8311c7a180e57685f
generated_at: 2026-10-17T02:37:42.644695+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/locale-overrides.spec.ts

## Purpose

Unit tests for the runtime locale-discovery and override tier (`src/infrastructure/locale-overrides.ts`). Every test defends the same invariant: the remote/locale-override layer must never be load-bearing — each function resolves (never rejects) and degrades to the bundled `src/locales/*.json` floor. A second invariant is the merge itself: overrides win **per key** and the merge is **deep**, so a single edited string cannot delete siblings under its group.

## Key elements

- **`capability(tag, apps?)`** — helper that builds a `GET /locales` capability row (tag, apps, source, etc.) for use as a fixture.
- **`getLocalesMock` / `getLocaleMessagesMock`** — untyped `vi.fn()` stubs standing in for the two network calls in `@api`; deliberately left untyped so partial fixture shapes are accepted.
- **`@api` mock** — preserves the real generated schema objects via `importOriginal` while replacing only `getLocales` and `getLocaleMessages` with the mocks above.
- **`fetchRemoteLocales`** — tests: returns API-reported language tags; keeps a language with any non-empty `apps` set; drops a language whose `apps` is empty (off-contract, intentionally not wrapped in `contractResponse`); resolves to `[]` on network failure or missing endpoint; passes a boot-specific timeout ≤ 2000 ms.
- **`fetchLocaleOverrides(locale)`** — tests: returns the edited message map; passes `{ app: 'demo-fe' }`; resolves to `{}` on network failure or a 404/undefined-data response.
- **`mergeRemoteLocales`** — tests: adds API-offered languages not in the bundle; is idempotent (no duplicates on repeated calls); leaves `supportedLanguages` untouched when the API is unreachable.
- **`withLocaleOverrides(locale, bundled)`** — tests: deep per-key merge (override wins, siblings survive); acts as the entire dictionary when the bundle has no file for that locale; falls back to the bundled copy when the fetch fails.
- **`refreshRunningLocale(locale)`** — tests: re-derives from this build's own bundled JSON (not a fixture) merged with fresh overrides, then registers the result with the shared `i18n` instance so a live edit (or revert) appears correctly.
- **`contractResponse(schema, data)`** — imported from the Orval fixture helper; wraps raw fixture data in the generated API envelope so the response shape matches the real contract.

## Relationships

- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `contractResponse`, which wraps fixture payloads in the Orval-generated response envelope (`{ success, status, message, data }`). Used in `beforeEach` and several individual tests to guarantee the mock responses conform to the generated schema shape. One test (empty-`apps` case) deliberately bypasses it to simulate an off-contract payload.

## Notes

- `supportedLanguages` is **shared module state** on the app-wide i18n instance. The test snapshots it in `beforeEach` and splices it back in `afterEach`; forgetting that restore would leak languages into sibling test files.
- The "drops a language with `apps: []`" test intentionally violates the generated schema (`minItems: 1`) and is **not** wrapped in `contractResponse` — it simulates a well-meaning-but-broken counterpart.
- The mocks are deliberately untyped (`vi.fn()` with no generics). The eslint-disable comments explain this is a feature, not a workaround.
- `refreshRunningLocale` uses the **real** `src/locales/it.json` bundle (imported via the `@/i18n` module), not a fixture, because the test must verify that a reverted edit does not get "stuck" from a prior layering.
- All five functions under test are expected to **resolve** (never reject); every failure-path assertion uses `.resolves.toEqual(...)` rather than `.rejects`.
