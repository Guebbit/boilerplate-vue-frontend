---
source: tests/unit/ui/use-copy-to-clipboard.spec.ts
sha256: 61c5b0f139eda27d031dfa8dc0c473a6b67bf1f6fc74c307233bf48adcb17b74
signature: 68a97bc40b61f921d6bdc0a9432214738aea626c4a9fa3951a4440229b47b76c
generated_at: 2026-11-10T08:29:55.733951+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-copy-to-clipboard.spec.ts

## Purpose
Unit tests for the `useCopyToClipboard` composable. Verifies two outcomes: a successful clipboard write fires a success toast with the i18n `copied` message, and a failed write fires a danger toast carrying the caller-supplied i18n key.

## Key elements
- **`build()`** — Mounts a throwaway component whose `setup()` calls `useCopyToClipboard` and captures the returned copy function. Exists solely to satisfy the composable's requirement for a Vue component context.
- **`renderNothing`** — A no-op render function (`() => null`) so the host component produces no DOM.
- **`vi.hoisted` block** — Declares `addMessageMock` and `copyToClipboardMock` so they are available to the `vi.mock` factory before any top-level `const` is evaluated.
- **`vi.mock('@guebbit/vue-toolkit', …)`** — Replaces `useNotificationsStore` with a stub whose `addMessage` is `addMessageMock`.
- **`vi.mock('@guebbit/js-toolkit', …)`** — Replaces `copyToClipboard` with `copyToClipboardMock`.
- **Test: success path** — Resolves `true`; asserts the text is passed to the clipboard and `addMessageMock` is called exactly once with `enMessages.generic.copied`.
- **Test: failure path** — Resolves `false`; asserts `addMessageMock` is called exactly once with `enMessages.generic['secret-reveal-copy-failed']` and `EToastType.DANGER`.

## Relationships
No graph neighbors are registered for this file.

## Notes
- `toHaveBeenCalledExactlyOnceWith` is a custom Vitest matcher (not part of the standard API); it asserts both call count *and* exact arguments in a single assertion.
- The failure toast message is **not** a fixed string in the composable — the caller passes an i18n key (`'generic.secret-reveal-copy-failed'`) at setup time, and the test verifies that exact key is resolved and forwarded.
- `loadLocale('en')` runs once in `beforeAll`; the test file is locale-specific and will break if the `en.json` keys referenced here are renamed or removed.
- The `build()` helper throws if `setup` never executes (safety against silent mount failures).
