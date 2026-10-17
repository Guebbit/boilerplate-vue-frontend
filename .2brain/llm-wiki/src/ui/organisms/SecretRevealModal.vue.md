---
source: src/ui/organisms/SecretRevealModal.vue
sha256: 05d478963e48f0a401e2b4974bb824ae5082dd281c788d59ff46a72c15d566cc
generated_at: 2026-10-17T01:58:40.430779+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/SecretRevealModal.vue

## Purpose

A blocking, one-time secret-reveal dialog. It displays a plaintext credential (e.g. a webhook subscription secret or a minted API key) exactly once, requires the visitor to explicitly confirm they saved it via a checkbox, and then emits `done`. Shared across every module that mints a machine credential; only the `title`/`intro` wording differs per call site.

## Key elements

- **`SecretRevealModal`** (named component) — Stable `name` for devtools and `<KeepAlive>`; required in a separate `<script>` block because `<script setup>` cannot declare one.
- **Props** — `secret: string` (required); `title?: string` and `intro?: string` (optional overrides for the default i18n strings).
- **Emit** — `done` — fired when the visitor clicks Continue after ticking the confirmation checkbox.
- **`confirmedSaved`** — `ref<boolean>` bound to the checkbox; gates the Continue button.
- **`watch(secret, …)`** — Resets `confirmedSaved` to `false` whenever a new secret value is supplied, preventing a stale tick from a previous reveal from auto-unlocking the dialog.
- **`copySecret()`** — Calls `copyToClipboard(secret)` (async Clipboard API with `execCommand` fallback); toasts success or a danger message based on the boolean result.

## Relationships

No graph neighbors are documented for this file.

## Notes

- **Checkbox is the only exit path.** The Continue button is `:disabled` until `confirmedSaved` is `true`, so the visitor cannot dismiss the dialog without acknowledging the secret.
- **No retrieval after close.** The component does not persist the secret; once the parent stops rendering it, the value is gone. There is no "go back" mechanism by design.
- **`copyToClipboard` contract.** It never rejects; it resolves `false` on failure (e.g. denied clipboard permission, non-secure context). The component branches on that boolean, not on a thrown error.
- **Modelled on `account/components/TwoFactorBackupCodes.vue`.** The "blocking dialog + confirm checkbox" pattern is the same; only the content differs.
- **Default i18n keys.** If a caller omits `title`/`intro`, the component falls back to `generic.secret-reveal-title` / `generic.secret-reveal-intro`. All current callers supply explicit strings because the credential kind changes the wording.
