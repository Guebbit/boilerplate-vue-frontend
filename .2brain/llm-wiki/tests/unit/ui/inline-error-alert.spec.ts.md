---
source: tests/unit/ui/inline-error-alert.spec.ts
sha256: f5df195e656c1edef2cca249160cbd46f5d80fcaa8764b150d4e34ccf66cc7c6
generated_at: 2026-10-17T02:46:40.458613+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/inline-error-alert.spec.ts

## Purpose

Unit tests for `InlineErrorAlert.vue` that verify the component's single meaningful decision point (conditional rendering based on `message`) and confirm that everything else — tone colour, displayed text, `role="alert"`, and arbitrary attributes — is a direct Vuetify `v-alert` pass-through. The file exists to guard the one branch that is *not* a pass-through while lightly asserting the rest in the same mount.

## Key elements

- **`mountAlert(props?)`** — local helper that mounts `InlineErrorAlert` with the shared Vuetify plugin (`@/ui/vuetify`) and an optional props override, returning a `VueWrapper`.
- **`describe('InlineErrorAlert — the render boundary')`** — two tests: no `[role=alert]` element when `message` is absent; element present and text visible when `message` is supplied.
- **`describe('InlineErrorAlert — the pass-through props')`** — three tests: default tone is `text-error`, an explicit `type: 'warning'` yields `text-warning`, and a `data-test` attribute falls through to the rendered alert (passed via `attrs`, not `props`).

## Relationships

No graph neighbors are recorded. The file imports the component under test (`@/ui/molecules/InlineErrorAlert.vue`) and the project's Vuetify plugin instance (`@/ui/vuetify`); it does not export anything.

## Notes

- The test philosophy (stated in the file's own doc-comment) is deliberate: only the `message`-set/unset branch is the "real" test. Prop pass-through checks exist to catch regressions where someone stops forwarding an attribute, not to re-test Vuetify.
- The `data-test` assertion is passed through **`attrs`** rather than **`props`**, exercising Vue's fall-through attribute mechanism specifically — a different code path than a declared prop.
- No mocking or spying is used; the component is exercised entirely through its rendered DOM.
