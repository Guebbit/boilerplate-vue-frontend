---
source: tests/unit/app/verification-banner.spec.ts
sha256: aa6bba6813077d0da717498e49c061045f058ba584bea0e2837eebd71d3aaf87
signature: 3eab5ba976c65fc58160265530c5ce0925f713b7de7bee55d498b1021fb72d2a
generated_at: 2026-11-10T07:52:02.062872+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/verification-banner.spec.ts

## Purpose

Unit tests for the `AppVerificationBanner` Vue component. They verify that banner visibility is driven solely by `viewer.verified` and not by any shop permission (e.g. the `Cart` subject), ensuring platform-only operators and unverified customers both see the banner while verified users do not.

## Key elements

- **`session`** – A module-level mock of the session store exposing a reactive `viewer` ref (`{ email, verified } | undefined`). Swapped in via `vi.mock('@/infrastructure/session.ts')`.
- **`requestEmailVerification`** – A `vi.fn` stub for the resend email call, reset in `beforeEach`.
- **`mountBanner`** – Helper that mounts `AppVerificationBanner` with a fresh Pinia instance and the real Vuetify plugin.
- **`describe('AppVerificationBanner')`** – Four test cases:
  - Guest (no viewer) → no banner.
  - Unverified visitor → banner visible regardless of permissions.
  - Unverified operator on a platform-only build → banner still visible (regression guard).
  - Verified visitor → banner hidden.
- **`vi.mock('vue-i18n')`** – Preserves the real module but replaces `useI18n` with a stub whose `t` returns `"key"` or `"key:seconds"` for assertion purposes.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The critical invariant under test is that the banner must **not** gate on `can('checkout', 'Cart')`. A prior implementation used that check, which hid the banner from platform-only operators who hold no `Cart` subject at all. Test #3 exists specifically to prevent that regression.
- Tests assert via the `[data-test="verify-banner"]` attribute selector rather than text content, keeping them decoupled from i18n strings.
- The i18n mock intentionally does **not** call the real `t` function; any test relying on formatted output must compare against the `"key:seconds"` pattern.
