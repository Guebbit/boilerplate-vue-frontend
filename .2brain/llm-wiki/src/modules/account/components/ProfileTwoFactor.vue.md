---
source: src/modules/account/components/ProfileTwoFactor.vue
sha256: e64a22a2c1e60b29a87b2f6056c6ea738d7e8068f3a573eb16cfb8e8d687aa83
signature: e64a22a2c1e60b29a87b2f6056c6ea738d7e8068f3a573eb16cfb8e8d687aa83
generated_at: 2026-11-10T03:22:06.419161+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileTwoFactor.vue

## Purpose

The account's two-factor authentication panel. It displays the armed methods (each removable or replaceable), the methods still available to add, and the backup-codes count. All code-guarded mutations (remove, disable-all, regenerate, enroll-with-existing-factor) funnel through one shared code-prompt dialog so the visitor proves an existing factor before any state change.

## Key elements

- **`CodePromptRequest`** — discriminated union (`remove`, `disable`, `regenerate`, `enroll`) that drives every code-guarded mutation through a single submission path.
- **`openEnroll(method)`** — entry point for adding or replacing a method. Branches on `status`: first factor opens the enroll dialog directly; a new second factor goes through the code prompt; a re-enrollment first shows a destructive confirm, then the code prompt.
- **`openCodePrompt(request)`** — shows a destructive confirm, then calls `startCodePrompt` to open the shared code dialog.
- **`submitCode()`** — runs `runCodePromptMutation`, toasts on success, or blocks the dialog in place on failure via `useBlockingError`.
- **`runCodePromptMutation(request, code)`** — dispatches to the correct `twoFactor` store action (`removeMethod`, `disableAll`, `setupMethod`, `regenerateBackupCodes`) and returns an optional toast message.
- **`sendProofCode()`** — mails a one-time code to the signed-in caller (for accounts whose only factor is delivered) so they can fill the prompt without spending a backup code.
- **`handleEnrollClose` / `handleBackupCodesDone`** — lifecycle handlers that chain the enroll dialog into the backup-codes reveal when the *first* factor is armed, then clear local state.
- **`revealedBackupCodes`** — local `ref<string[]>` holding one-time codes; deliberately kept out of the Pinia store (same "never park a secret in a store" idiom used by api-keys / webhooks).
- **`deliveredMethod`** — computed that finds the armed method flagged `delivers` by the server; gates the "Send code" button.
- **`useReturnFocus`** (×3) — restores focus to the originating control when the enroll, backup-codes, or code-prompt dialog closes.
- **`useBlockingError`** — in-dialog error display; a wrong code or server failure keeps the prompt open instead of toasting.

## Relationships

- **`src/modules/account/components/TwoFactorEnroll.vue`** — child dialog rendered when `enrolling` is set. Receives `pendingSetup` (the setup payload from a successful code-gated `setupMethod` call) so it opens pre-configured rather than re-initiating setup. Emits `close` with optional `backupCodes` for the first-factor flow.
- **`src/modules/account/components/TwoFactorBackupCodes.vue`** — child dialog rendered when `revealedBackupCodes` is set. Displays the one-time codes from either a first-factor enrollment or a regenerate.
- **`src/modules/account/composables/use-method-label.ts`** — provides `methodLabel()` to translate wire-name method identifiers into i18n display labels used in confirm messages and toasts.
- **`src/modules/account/stores/two-factor.ts`** — the Pinia store holding all 2FA state (`status`, `mutatingWithCode`, `secondsUntilResend`) and every mutation action. This component is the exclusive view layer over it.
- **`src/modules/account/views/Profile.vue`** — parent view that slots this component into the account profile page.
- **`src/modules/account/tests/two-factor-view.spec.ts`** — integration/unit test covering this component's flows.

## Notes

- Backup codes live in a **local ref**, not the store, following the codebase convention for one-time secrets (see api-keys, webhooks).
- A wrong code or any mutation failure **blocks the code-prompt dialog in place** (`useBlockingError`); the dialog never auto-closes on failure. The confirmation step is not repeated on retry.
- `openEnroll` reads `status` to decide "first vs. second vs. replace" rather than accepting a boolean flag — the two render lists and `status` already agree, so a flag at the call site would be redundant state.
- The first-factor enrollment path skips the code prompt entirely: the route-level `ReauthDialog` already demands a fresh password, and no existing factor exists to verify against.
- `sendProofCode` is the fallback for accounts whose only armed factor is a *delivered* method (e.g. email) and therefore has no local device from which to read a code. The server's `delivers` flag, not a name check, determines eligibility.
