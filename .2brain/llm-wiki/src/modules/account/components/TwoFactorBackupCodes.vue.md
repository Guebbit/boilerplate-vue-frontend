---
source: src/modules/account/components/TwoFactorBackupCodes.vue
sha256: b6eedc4a4f6835b972d6b6bcbdf30d3fac7025111e2e58bb20f3ad388d430083
signature: 3026b74388c75aaf9849acc2b841ac4a09937239fb514dacb678a44c03f520f9
generated_at: 2026-11-10T03:23:01.857695+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/TwoFactorBackupCodes.vue

## Purpose

A one-shot display screen for two-factor backup codes. It renders the codes exactly once at enrolment, forces the user to confirm they've saved them via a checkbox, and then emits `done`. Because the codes are never retrievable after this point, the component is intentionally blocking — there is no way to proceed without ticking the confirmation.

## Key elements

- **`codes` prop (`string[]`)** — the backup codes to display in the clear; passed in by the parent and assumed to be populated only during the first factor enrolment.
- **`emit('done')`** — fired when the user clicks the "Continue" button after confirming they saved the codes.
- **`confirmedSaved` ref** — local state backing the required checkbox; gates the "Continue" button (`:disabled="!confirmedSaved"`).
- **`watch(codes)`** — resets `confirmedSaved` to `false` whenever the `codes` prop changes, preventing a stale tick from a prior enrolment from bypassing the confirmation.
- **Component name block (`<script lang="ts">`)** — declares `name: 'TwoFactorBackupCodes'` so `<KeepAlive>` and devtools can identify the component (necessary because `<script setup>` cannot set a name itself).
- **Template** — a Vuetify `v-card` containing the code list (monospace, 2-column grid), a `v-checkbox` for confirmation, and a `v-btn` for "Continue".

## Relationships

- **`src/modules/account/components/ProfileTwoFactor.vue`** — parent/consumer. Passes the `codes` prop and listens for the `done` event to dismiss this one-time screen.

## Notes

- The `confirmedSaved` reset via `watch` is deliberate: without it, a re-emission of `codes` (e.g., a race or re-mount) could let a previously-ticked checkbox silently approve a new set of codes the user never read.
- There is no "back" or "skip" path — by design, the only exit is confirming the codes were saved and clicking Continue.
- Data-test attributes (`backup-codes-list`, `backup-codes-confirm-saved`, `backup-codes-continue`) are present for E2E/Cypress selectors.
