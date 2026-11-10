---
source: tests/unit/infrastructure/locale-overrides.spec.ts
sha256: 10253eda15561e66dbd2bad70574e0fdd9c823f44b8bdfbbfe57c982fd8dc13b
signature: 810523570ae620f56911fa8918777e8b9660285a121be1775df608c97b37f597
generated_at: 2026-11-10T08:01:20.888307+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/locale-overrides.spec.ts

## Purpose

Unit tests for `src/infrastructure/locale-overrides.ts`, the runtime locale-discovery and message-override tier. Every test defends two invariants: (1) **no function here may be load-bearing** — the bundled `src/locales/*.json` is the floor and every call must resolve (never reject) so the app remains fully usable when the API is unreachable or silent; (2) **the merge is deep and per-key** — a shallow merge would silently delete sibling keys under an edited group, the most likely real-world regression this tier could ship with.

## Key elements

- **`fetchRemoteLocales`** — returns the list of active language tags the API reports; filters out deactivated/`static`-only rows, keeps half-usable (single-app) languages, drops rows with empty `apps`, and resolves `[]` on network failure or missing endpoint. Must complete within ≤ 2 s (boot-blocking read awaited in `main.ts`).
- **`fetchLocaleOverrides`** — returns the edited message dictionary for one locale (calls `getLocaleMessages` with `app: 'demo-fe'`); resolves `{}` on network failure or 404/undefined response.
- **`mergeRemoteLocales`** — mutates the shared `supportedLanguages` array: adds API-offered languages not yet bundled, removes bundled languages the shop has deactivated, and is idempotent (no duplicates on repeated calls).
- **`isDraftLanguage`** — checks whether a given tag is a draft language visible to staff but not to visitors.
- **`withLocaleOverrides`** / **`refreshRunningLocale`** — runtime helpers for applying overrides to the live i18n instance and refreshing the currently active locale.
- **`capability(tag, apps?, opts?)`** — local helper that builds a single `GET /locales` row (tag, `apps`, `active`, `source`, etc.) without running the Orval schema, allowing off-contract edge cases (e.g. `apps: []`).
- **`manifest(withDraft)`** — wraps a full `ListLocalesResponse` body via `contractResponse` so the fixture is schema-validated.
- **`getLocalesMock` / `getLocaleMessagesMock`** — untyped `vi.fn()` stubs injected into a `vi.mock('@api')` that preserves the real generated const objects via `importOriginal` while replacing only the two network calls.

## Relationships

- **`tests/support/unit/orval-fixture-schema.ts`** — supplies `contractResponse`, which validates a fixture body against the Orval-generated schema before returning it. Every happy-path fixture in this spec (`manifest(...)`, the `beforeEach` defaults) passes through `contractResponse` so the SUT receives a contract-conformant envelope; the one deliberate exception is the `apps: []` test, which bypasses it to simulate a broken counterpart.

## Notes

- Mocks are **deliberately untyped** (`vi.fn()` with no generic). They return partial fixture shapes that the real generated envelope types would reject; the looseness is intentional. ESLint suppressions document this.
- `supportedLanguages` is **shared module state** (the same array the running app mutates). The test must snapshot it in `beforeEach` and splice-back in `afterEach`; forgetting the restore leaks state into other spec files in the same worker.
- The `apps: []` test **intentionally bypasses `contractResponse`** (the schema enforces `minItems: 1`) to simulate a broken counterpart — it tests the SUT's defensive filtering, not schema compliance.
- `fetchRemoteLocales` is **boot-blocking** (`main.ts` awaits it before mounting). The timeout assertion (`≤ 2000 ms`) guards against a regression to the client's default 10 s timeout stalling first paint.
- The `@api` mock uses `importOriginal` to keep generated const objects (e.g. enum values) available for comparison inside the SUT while replacing only the two async network functions.
- All "failure" paths assert `.resolves` (never `.rejects`): the contract is that these functions degrade to the bundled floor, not surface errors to the caller.
