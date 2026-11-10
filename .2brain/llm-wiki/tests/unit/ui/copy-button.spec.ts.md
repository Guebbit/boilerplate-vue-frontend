---
source: tests/unit/ui/copy-button.spec.ts
sha256: 6cac4e1d46b1dd61a4119d29c1f66bc8f77ef7db624db11a3e3b6068fcefe0ae
signature: dd7abf597cb8cf811bcedc6a37f54bccac32d7abf94760cf0221d6d79c1afd3d
generated_at: 2026-11-10T08:24:13.104860+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/copy-button.spec.ts

## Purpose

Unit test for `CopyButton.vue` that verifies the button's public contract: it always renders an icon, exposes the caller-supplied label as its accessible name, passes through the caller's `data-test` hook, and delegates the actual clipboard write to the toolkit's `copyToClipboard` (mocked here) with exactly the text provided.

## Key elements

- **`mountButton()`** — local helper that mounts `CopyButton` with fixed props (`text`, `label`, `failureKey`), a `data-test` attribute, and the Vuetify + i18n plugins.
- **`copyToClipboardMock`** — `vi.hoisted` mock standing in for `@guebbit/js-toolkit`'s `copyToClipboard`; reset and set to resolve `true` in `beforeEach`.
- **Test 1 – renders an icon, named by the caller, with the caller's test hook** — asserts an `<svg>` exists, `aria-label` equals the `label` prop, and the `data-test` attribute is forwarded.
- **Test 2 – copies exactly the given text on click** — triggers a click on the `<button>` and asserts `copyToClipboardMock` was called with the exact `text` prop value.

## Relationships

No dependency-graph neighbors are recorded for this file.

## Notes

- `vi.hoisted` is used to create the mock **before** `vi.mock` runs (Vitest hoists `vi.mock` calls above imports).
- The `failureKey` prop is supplied but no failure-path scenario is tested; the contract covered is only the happy path.
- Test 2 returns the promise chain from `trigger('click')` so Vitest awaits the async `expect`.
- The sample `text` is a realistic IBAN (`IT60X…`), making the assertion visually unambiguous.
