---
source: src/ui/organisms/SecretRevealModal.vue
sha256: 6ef405814222a06bf4256ec924c2c608675908bd9fadd883451f4098d12281e6
signature: b46f72a358444450c18380beafbc90272b410ec7ad75e659d65f2741728683d6
generated_at: 2026-11-10T06:32:43.784343+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/SecretRevealModal.vue

## Purpose

A one-time, blocking dialog that displays a plaintext secret (e.g. a webhook subscription secret or a minted API key) in the clear for the sole chance it will ever be shown to the user. It enforces an explicit "I saved this" checkbox before the user can dismiss it, preventing accidental loss of a credential that cannot be recovered.

## Key elements

- **Props** — `secret` (the one-time value; dialog is open while set), `title` and `intro` (optional wording overrides; default to generic i18n strings).
- **`done` emit** — fired once the user confirms they saved the secret and clicks Continue.
- **`confirmedSaved` ref** — gates the Continue button; reset to `false` via a `watch` on `secret` so a stale tick from a previous reveal cannot authorize the next one.
- **`DIALOG_MAX_WIDTH.wide`** — passed to `DialogShell` for the wide layout.
- **`data-test` attributes** — `secret-reveal`, `secret-reveal-value`, `secret-reveal-confirm-saved`, `secret-reveal-continue` for E2E selectors.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The component uses the two-block pattern (a plain `<script>` for `name` + `<script setup>` for logic) because `<script setup>` alone cannot declare a component name needed by `<KeepAlive>` / devtools.
- The dialog is **persistent** (`persistent` prop on `DialogShell`): it cannot be dismissed by clicking outside or pressing Escape. The only exit path is the checkbox + Continue button.
- Modeled after `account/components/TwoFactorBackupCodes.vue`; the interaction pattern (blocking, checkbox-gated) is intentionally identical across all secret-reveal surfaces.
- Every current caller passes `title` and `intro` because the wording differs per credential kind, but the props remain optional with neutral i18n fallbacks.
