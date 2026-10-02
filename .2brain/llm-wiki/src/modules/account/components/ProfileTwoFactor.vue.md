---
source: src/modules/account/components/ProfileTwoFactor.vue
sha256: e17d099a30ea2aeb793eef5c590636e25854445edfa22e6a4614ecb7698bd677
generated_at: 2026-10-02T14:45:24.382888+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileTwoFactor.vue

## Purpose

The account's two-factor authentication management panel. It renders the list of armed 2FA methods (each removable, or replaceable if already armed), offers enrollment for methods the server says are still available, and manages backup-code reveal/regeneration. Every mutation that must prove an existing factor funnels through a single shared code-prompt dialog, layered on top of the fresh-auth re-authentication the route already requires.

## Key elements

- **`openEnroll(method)`** — Entry point for "Add" / "Replace" on a method row. First factor: opens `TwoFactorEnroll` directly. Already-armed: confirms via `useDialogStore().confirm` first, then delegates to `startCodePrompt`. New second method: goes straight to the code prompt.
- **`CodePromptRequest`** (type) — Discriminated union (`remove`, `disable`, `regenerate`, `enroll`) that the single code-prompt dialog dispatches on in `runCodePromptMutation`.
- **`startCodePrompt` / `openCodePrompt`** — Open or confirm-then-open the shared code prompt, resetting the input and any prior blocking error.
- **`submitCode()`** — Reads the typed code, calls `runCodePromptMutation`, toasts on success (when applicable), closes the prompt, or feeds the error back into the dialog via `useBlockingError`.
- **`runCodePromptMutation(request, code)`** — Routes to the correct `twoFactor` store action (`removeMethod`, `disableAll`, `setupMethod`, `regenerateBackupCodes`) and returns the toast string (or `undefined` when the follow-up dialog itself is the feedback).
- **`handleEnrollClose` / `handleBackupCodesDone`** — Bridge between the enroll dialog and the backup-codes reveal; the latter also calls `twoFactor.clearSetup()` to reset resend cooldown.
- **`revealedBackupCodes`** (ref) — Holds one-time backup codes locally; deliberately kept out of the Pinia store (same "never park a secret in a store" idiom used by `api-keys` / `webhooks`).
- **`deliveredMethod`** (computed) — Finds the one armed method whose `delivers` flag is true, used by the "send code" button so a caller without a device can still prove identity.
- **`availableToEnroll` / `unavailable`** (computed) — Split `status.available` by the server's `enrollable` flag; no client-side method-name checks.
- **`useReturnFocus`** calls — Restore keyboard focus to the originating control when the enroll, backup-codes, or code-prompt dialog closes.

## Relationships

- **`useTwoFactorStore`** (`@/modules/account/stores/two-factor.ts`) — All read state (`status`, `mutatingWithCode`, `sendingCode`, `secondsUntilResend`) and every mutation action flow through this Pinia store.
- **`useMethodLabel`** (`@/modules/account/composables/use-method-label.ts`) — Translates wire method names into display labels for confirmations and toasts.
- **`useDialogStore`** (`@/ui/dialog.ts`) — Confirmation prompts before destructive actions (remove, disable-all, regenerate, re-enroll).
- **`useBlockingError`** (`@/infrastructure/utils/use-blocking-error.ts`) — Keeps a wrong-code or other failure visible inside the code-prompt dialog instead of dismissing it.
- **`TwoFactorEnroll.vue` / `TwoFactorBackupCodes.vue`** — Child dialogs for enrollment flow and backup-code reveal, respectively.
- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor; no direct import is visible in the provided content, so the interaction (if any) is indirect or in the truncated portion.

## Notes

- **Errors stay in the dialog.** A wrong code or server failure does not toast; `useBlockingError` surfaces the message inline and the dialog stays open for another attempt. This is intentional (see `docs/theory/request-flow.md`).
- **First factor is special-cased.** It skips the code prompt entirely because the route's re-auth already proved identity. The code reads `status.methods.length` to decide; there is no separate "isFirst" flag.
- **Replace = confirm + code prompt.** Re-enrolling an already-armed method requires a destructive confirmation *before* the code prompt, because it disarms the current factor.
- **Server decides availability.** Both `availableToEnroll` and `deliveredMethod` read server-provided flags (`enrollable`, `delivers`); no client-side method-name branching, so new methods need no code change here.
- **`pendingSetup`** carries the setup payload from `setupMethod` into `TwoFactorEnroll` so the dialog resumes rather than starting a second setup session.
