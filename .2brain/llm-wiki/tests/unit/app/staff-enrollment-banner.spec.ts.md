---
source: tests/unit/app/staff-enrollment-banner.spec.ts
sha256: 77403907d89fa04a9c04952f6b8fcc05295ad2e7d703ed72e1bba9f5ab413a79
signature: 85e841809b0f87fcd5cc8ba50e9fdeb3cf7d0c4d6138c59ee0bd37f853d96767
generated_at: 2026-11-10T07:50:33.987568+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/staff-enrollment-banner.spec.ts

## Purpose

Unit tests for the `AppStaffEnrollmentBanner` component, verifying its visibility contract: the banner is driven by the session's `secondFactorRequired` flag combined with a signed-in viewer, not by a hardcoded role check. It exists to lock down the three visibility states (guest, already-enrolled staff, pending staff) so the banner can't regress into showing for the wrong audience.

## Key elements

- **`session` (module-level mock)** — A plain object with `viewer` and `secondFactorRequired` refs that replaces the real Pinia session store via `vi.mock('@/infrastructure/session.ts')`. Mutated directly in each test; reset in `beforeEach`.
- **`mountBanner()`** — Helper that mounts `AppStaffEnrollmentBanner` with a real `createPinia()` instance and the project's Vuetify plugin, keeping the component's reactive dependencies functional.
- **`vi.mock('vue-router')`** — Preserves the real router but swaps `RouterLink` for a bare `<a>` template so no navigation side-effects occur during mount.
- **`vi.mock('vue-i18n')`** — Keeps the real i18n module but overrides `useI18n` so `t(key)` returns the key string (passthrough), avoiding locale-file lookups in tests.
- **`vi.mock('@/i18n/router-link.ts')`** — Reduces `routerLinkI18n` to an identity function.
- **Three `it` blocks** — Each asserts presence/absence of `[data-test="staff-enrollment-banner"]` (and `[data-test="staff-enrollment-go"]` in the positive case) for: guest, enrolled staff, and pending staff.

## Relationships

No graph-neighbor files are recorded for this spec. The file's imports (`AppStaffEnrollmentBanner.vue`, the session store, `vue-router`, the i18n helpers, and `vue-i18n`) are all mocked or stubbed in place so the tests run without reaching those modules' real implementations.

## Notes

- The mocked `session` object is **not** a real Pinia store — it's a plain object with `ref` values. The component still accesses it through the (mocked) `useSessionStore` call, so mutating `session.viewer.value` works without a store instance.
- `beforeEach` resets both `viewer` and `secondFactorRequired` to falsy; if a new test relies on a non-default starting state it must set it explicitly.
- The positive test asserts two `data-test` attributes; the negative tests assert only the banner wrapper. If the component adds new interactive elements, the positive case should be extended.
- The banner's visibility logic (per the file's doc comment) treats "role present **and** `secondFactorRequired === false`" as "already enrolled → hide." Tests encode this; the component source holds the actual conditional.
