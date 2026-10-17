---
source: src/modules/account/components/TwoFactorBackupCodes.vue
sha256: 36eaa532a1ff10dc8b69b2733ebdd898f0ef8d247ee921917405075a0032dc55
generated_at: 2026-10-17T00:17:03.624316+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/TwoFactorBackupCodes.vue

## Purpose
A one-time, blocking confirmation screen that displays a set of 2FA backup codes to the user. It is rendered only at the moment an account first arms a second factor (the store's `confirmed.backupCodes` is populated exactly once), and the user must explicitly acknowledge having saved the codes before proceeding. Because the codes are never retrievable again, this component acts as a hard gate in the enrollment flow.

## Key elements
- **`codes: string[]` (prop)** — The backup codes to render, shown in the clear. Passed down from the parent; this component never fetches them itself.
- **`done` (emit)** — Fired once the user checks the "I have saved these codes" checkbox and clicks the primary button.
- **`confirmedSaved` (ref)** — Gates the `Done` button (`:disabled`). Reset to `false` by a `watch` on `codes`, so a stale tick from a previous enrollment cannot bypass the acknowledgement.
- **Dual `<script>` blocks** — The non-setup block exists solely to assign `name: 'TwoFactorBackupCodes'` for `<KeepAlive>` / devtools, since `<script setup>` cannot set a component name.
- **`data-test` attributes** — `two-factor-backup-codes`, `backup-codes-list`, `backup-codes-confirm-saved`, `backup-codes-continue` — stable hooks for e2e tests.

## Relationships
- **`ProfileTwoFactor.vue`** — Parent/owner. Renders this component, supplies the `codes` prop (from `useTwoFactorStore().confirmed.backupCodes`), and listens for the `done` event to advance the enrollment flow and clear the one-time code from state.

## Notes
- The component is intentionally stateless beyond the `confirmedSaved` ref; all data is injected via props and all navigation is delegated via the `done` emit. It has no route or store coupling of its own.
- The `watch` on `codes` is a defensive reset: if a parent were to re-mount this component with a new code list, the user would be forced to re-acknowledge rather than inheriting a stale tick.
- Translation keys follow the `two-factor.backup-codes-*` namespace; adding a new screen string requires a matching i18n entry.
