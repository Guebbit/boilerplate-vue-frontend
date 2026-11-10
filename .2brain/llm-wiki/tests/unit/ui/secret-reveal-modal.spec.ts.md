---
source: tests/unit/ui/secret-reveal-modal.spec.ts
sha256: 8f4555f236e46d823fac5fd2c23d1d8b0ce7c806cfaedbd6eb3884b49ae62cec
signature: 2c5b7bb798e585c457870b9727686103944c7bbc683b9224bb2bced138b87c7e
generated_at: 2026-11-10T08:28:52.969480+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/secret-reveal-modal.spec.ts

## Purpose

Unit test for `SecretRevealModal.vue` covering the two behaviors that carry actual logic in an otherwise static dialog: the copy-to-clipboard success/failure toast path, and the modal's ownership of its dialog card (visibility tied to the `secret` prop, and unique ARIA ids when multiple instances coexist).

## Key elements

- **`vi.hoisted` block** – creates `addMessageMock` and `copyToClipboardMock` outside the normal top-level evaluation order (see Notes).
- **`vi.mock('@guebbit/vue-toolkit', …)`** – keeps the real module (including the `EToastType` enum the component branches on) but replaces `useNotificationsStore().addMessage` with `addMessageMock`.
- **`vi.mock('@guebbit/js-toolkit', …)`** – replaces `copyToClipboard` with `copyToClipboardMock`.
- **`mountModal(props)`** – mounts the component with the `vuetify` and `i18n` plugins and a `VDialog` stub that renders its slot conditionally on `modelValue`, avoiding Vuetify's teleport-to-`document.body` behavior.
- **`clickCopy(wrapper)`** – locates the copy button (the only `button[aria-label]` in the template) and triggers a click.
- **`describe('… copying the secret')`** – two specs asserting the success toast (`copied`) and the failure toast (`secret-reveal-copy-failed` + `EToastType.DANGER`) via `vi.waitFor`.
- **`describe('… owning its dialog')`** – verifies the card appears when `secret` is set and disappears when cleared; verifies two mounted instances produce distinct `id` values that their `aria-labelledby` attributes reference.

## Relationships

No graph neighbors are tracked for this file.

## Notes

- **`vi.hoisted` is load-bearing.** A plain top-level `const` for the mocks would not yet be assigned when `@guebbit/vue-toolkit`'s mock factory runs (its import graph pulls in `@guebbit/js-toolkit`, whose mock factory can evaluate first). `vi.hoisted` guarantees the mock functions exist before either factory body executes.
- **`EToastType` stays real.** It is a plain enum the component reads to set toast severity; mocking the whole toolkit package would lose that value. Only `addMessage` is spied so assertions can inspect the severity argument.
- **VDialog stub.** The real `VDialog` teleports its card into `document.body`, which would escape the `wrapper` returned by `mount`. The stub renders the slot inline, keeping all queries local.
- **Copy-button selector.** The helper targets `button[aria-label]` specifically because the copy button is the only `<v-btn>` in the modal that carries an `aria-label` (icon button, no visible text). If the component gains another labelled button, the selector will silently match the wrong one.
