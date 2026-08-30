# tests/unit/infrastructure/utils/formatters.spec.ts

## Purpose

Vitest suite covering the display-formatter utilities (`@/infrastructure/utils/formatters`). It was written after a mutation-testing run scored the module 0% (every mutant survived because no test exercised it). Its job is to pin down the happy-path output of each formatter **and** the fallback-to-`EMPTY_VALUE` branch that only triggers when data is missing — the branch nobody hits by clicking through the UI.

## Key elements

- **`formatText` tests** — passthrough for non-blank strings; `EMPTY_VALUE` for `undefined`, `null`, `''`, and whitespace-only input; surrounding whitespace preserved on valid text.
- **`formatDateTime` / `formatDate` / `formatTime` tests** — localized rendering of ISO strings; asserts that `formatDate` drops the time component and `formatTime` drops the date component; fallback for missing input.
- **`formatCurrency` tests** — two-decimal + symbol by default, explicit currency code, custom `Intl` options, graceful degradation for invalid codes, `0` rendered (not treated as missing), fallback for non-numbers.
- **`formatMegabytes` tests** — byte-to-MB rounding (not truncation), zero rendered, fallback for missing input.
- **`formatFlag` tests** — true/false label selection; `undefined`/`null` treated as missing, not as `false`.
- **`formatUptime` tests** — seconds→"Xm" or "Xh Ym" rendering; zero renders as "0m"; fallback for missing input.
- **"the app-shaped bindings" block** — a dedicated `describe` that uses `vi.resetModules()`, `vi.stubEnv`, and `vi.doMock` to verify two fragile `||`/`??` expressions at module top-level: (1) `EMPTY_VALUE` falls back to an em-dash `—` when `VITE_APP_EMPTY_VALUE` is unset, and (2) the i18n locale binding passes `undefined` (not `''`) to `Intl` so a locale-less boot doesn't throw a `RangeError`.

## Relationships

No dependency-graph neighbors are recorded for this file. It imports only from `vitest` and the module under test (`@/infrastructure/utils/formatters`); the i18n mock targets `@/infrastructure/i18n` but that relationship is exercised solely through the mock, not a static import.

## Notes

- The "app-shaped bindings" block **must** use dynamic `await import()` after `vi.resetModules()`; static imports at the top of the file would bypass the env-var and i18n mocks entirely.
- `formatText` treats whitespace-only strings (`'   '`) as empty but preserves surrounding whitespace on non-blank strings (`'  Gadget  '` stays as-is). This is a deliberate asymmetry — easy to "fix" in a refactor and break a rendering assumption.
- `formatCurrency(0)` and `formatUptime(0)` must produce visible output, not `EMPTY_VALUE`. The `0`-is-not-missing contract is tested explicitly for both.
- The i18n locale test asserts the call does **not** throw and the result is **not** `EMPTY_VALUE`; it does not assert a specific locale string, keeping the test locale-agnostic.
