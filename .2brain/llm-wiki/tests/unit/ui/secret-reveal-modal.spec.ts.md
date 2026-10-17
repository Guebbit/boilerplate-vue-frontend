---
source: tests/unit/ui/secret-reveal-modal.spec.ts
sha256: c29a902711109a671b82e47e292d6aa7b3fbcc2ec3fdea885f2c2b0572702bc4
generated_at: 2026-10-17T02:47:11.872013+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/secret-reveal-modal.spec.ts

## Purpose

Unit test for `SecretRevealModal.vue`'s copy-to-clipboard button. It guards the failure path: when `copyToClipboard` resolves `false` (permission denied, no Clipboard API, `execCommand` refused), the modal must surface a DANGER toast rather than silently letting the user believe the one-time secret was copied.

## Key elements

- **`mountModal`** — mounts `SecretRevealModal` with a fixed `secret` prop, vuetify, and i18n plugins.
- **`clickCopy`** — locates the copy button via `button[aria-label]` (the only `v-btn` with an icon and no visible text) and triggers a click.
- **`addMessageMock` / `copyToClipboardMock`** — hoisted `vi.fn()` spies, declared with `vi.hoisted` so they exist before the mock factories run.
- **`vi.mock('@guebbit/vue-toolkit')`** — replaces `useNotificationsStore` with a stub returning `{ addMessage: addMessageMock }`; everything else in the package stays real.
- **`vi.mock('@guebbit/js-toolkit')`** — replaces `copyToClipboard` with `copyToClipboardMock`; the rest of the toolkit stays real.
- **Test cases** — one asserts a success toast with the `secret-reveal-copied` message; the other asserts a DANGER-severity toast with the `secret-reveal-copy-failed` message.

## Relationships

No graph neighbors are recorded for this file. It imports from `@/ui/organisms/SecretRevealModal.vue`, `@/ui/vuetify`, `@/i18n`, `@/locales/en.json`, and the two `@guebbit/*` packages (both partially mocked).

## Notes

- **`vi.hoisted` is mandatory here.** `@guebbit/vue-toolkit`'s import graph pulls in `@guebbit/js-toolkit` during mock-factory evaluation, so both factories can execute before a later top-level `const` assignment would have run. Plain module-scope variables would be `undefined` inside the factories.
- **`EToastType` is intentionally *not* mocked** — it is a plain enum the component branches on. Only `addMessage` is spied so assertions can read the severity argument.
- **Async assertions use `vi.waitFor`** (polling) rather than `await`ing the mock directly, because the toast fires inside the component's `.then` chain.
- The copy button is selected structurally (`button[aria-label]`), not by a data-test attribute, so adding a test attribute to the component would break this test.
