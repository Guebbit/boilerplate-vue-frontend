---
source: tests/unit/app/health-banner.spec.ts
sha256: aeb900c4483cfbebbb052ace4eba3539ee326ca68a0373db4414c4a61b7ae97d
signature: a5526a180e8fb871f46ccd1bd4b0a35f17739fa708f7c9da053acd43b5962e73
generated_at: 2026-11-10T07:46:24.722586+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/health-banner.spec.ts

## Purpose

Unit-test suite for the `AppHealthBanner` Vue component. It verifies the component's contract: the banner is hidden while the API is reachable, appears the instant the liveness probe reports a failure, and disappears on recovery. It also asserts that the `aria-live` status region remains mounted at all times so screen readers can announce the state change.

## Key elements

- **`AppHealthBannerInLayout`** – Inline `defineComponent` wrapper that registers `VApp` + `AppHealthBanner` and renders `<v-app><app-health-banner /></v-app>`. Exists solely to satisfy `VSystemBar`'s requirement for a `VApp`/`VLayout` ancestor.
- **`down`** – Module-level `ref(false)` shared with the mock; flipping it simulates the probe going down/up without re-mounting.
- **`vi.mock('@guebbit/vue-toolkit')`** – Replaces `useLivenessProbe` with a stub returning `{ down, check: vi.fn(), stop: vi.fn() }`.
- **`vi.mock('vue-i18n')`** – Spreads the real module but overrides `useI18n` to return `{ t: (key) => key }`, so assertions can check the raw i18n key.
- **`mountBanner()`** – Helper that mounts `AppHealthBannerInLayout` with the app's Vuetify plugin.
- **Four `it` blocks** – (1) banner absent when `down = false`; (2) banner present and text contains `generic.api-unreachable` when `down = true`; (3) banner removed after `down` flips back to `false` (via `$nextTick`); (4) `[role="status"]` with `aria-live="polite"` always exists.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `VApp` wrapper is non-optional: `VSystemBar` (rendered inside the banner) throws at runtime without an ancestor `VApp`/`VLayout`. The app relies on `vite-plugin-vuetify` per-SFC auto-import, so a bare `<v-app>` tag in the inline template would not resolve; the component must be imported and registered explicitly.
- The third test wraps its async body in `Promise.resolve().then()` inside a synchronously-declared `it` callback — a Vitest pattern to avoid a top-level `async` while still awaiting `$nextTick`.
- The suite intentionally does **not** exercise the real `getHealth()` call or the toolkit's retry loop; that behavior belongs to `@guebbit/vue-toolkit`'s own test suite.
