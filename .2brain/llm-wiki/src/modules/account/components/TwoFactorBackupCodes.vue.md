---
source: src/modules/account/components/TwoFactorBackupCodes.vue
sha256: 67674732d0f5833078d8d2d3c18a792e113ae7e5adf122e0a66fd75ab7403e9f
generated_at: 2026-10-02T12:13:03.900774+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/TwoFactorBackupCodes.vue

## Purpose

Renders the one-time backup-codes screen shown during two-factor enrolment. It displays the `codes` prop in the clear, forces the visitor to acknowledge saving them via a checkbox, and emits `done` only after that confirmation. By design there is no "skip" or "close" path — the codes are never retrievable again.

## Key elements

- **`codes: string[]` (prop)** — The backup codes to display. Populated once at enrolment by the parent and never re-fetched.
- **`confirmedSaved` (ref)** — Local toggle bound to the "I have saved these codes" checkbox. Gates the Done button.
- **`watch(() => codes, …)`** — Resets `confirmedSaved` to `false` whenever a new `codes` array arrives, preventing a stale tick from auto-confirming a fresh set.
- **`emit('done')`** — Single emitted event, fired by the Done button once the checkbox is ticked.
- **`t` (from `useI18n`)** — All visible copy is i18n-keyed under the `two-factor.backup-codes-*` namespace.

## Relationships

No graph neighbours are recorded for this file. It is a leaf presentational component: it receives `codes` and emits `done`; the parent component (not listed) owns the store interaction and navigation.

## Notes

- Two `<script>` blocks are used: the plain `<script lang="ts">` sets the component `name` for DevTools/debugging, while all logic lives in `<script setup lang="ts">`.
- The component is intentionally **blocking** — there is no close button, no "I'll save them later" path, and the Done button stays disabled until `confirmedSaved` is true. This is a product requirement, not an oversight.
- All interactive elements carry `data-test` attributes (`two-factor-backup-codes`, `backup-codes-list`, `backup-codes-confirm-saved`, `backup-codes-continue`) for E2E test selectors.
- The codes list uses a CSS grid (`grid-cols-2`) with a monospace font for readability; codes are rendered in the clear with no masking.
