---
source: src/modules/account/components/ProfileTwoFactor.vue
sha256: dcd5e5b5ee2492dd1f934afe05e6ab604445811288fe96bf47722791d8aa5662
generated_at: 2026-10-17T00:16:55.128880+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileTwoFactor.vue

## Purpose

The account's 2FA management panel. It renders the list of armed second-factor methods (each removable; an already-armed one also replaceable), the methods still available for enrollment, and the backup-codes count. Every code-guarded mutation (remove, disable-all, regenerate, enroll-while-armed) flows through a single shared code-prompt dialog, with in-dialog error blocking instead of toasts.

## Key elements

- **`CodePromptRequest`** — discriminated union (`remove | disable | regenerate | enroll`) that drives the shared code-prompt dialog; `submitCode` dispatches to the correct store action based on `kind`.
- **`openEnroll(method)`** — decides whether to open the enrollment dialog directly (first factor), go straight to the code prompt (new method), or show a destructive confirm before the code prompt (replace an armed method). Reads `status` rather than accepting a flag.
- **`openCodePrompt(request)`** — wraps `useDialogStore().confirm()` then calls `startCodePrompt`, used by `handleRemove`, `handleDisableAll`, and `handleRegenerate`.
- **`runCodePromptMutation(request, code)`** — maps the four `CodePromptRequest` kinds to their store actions and resolves a toast message (or `undefined` when the follow-up dialog *is* the feedback).
- **`submitCode()`** — submits the typed code; on success toasts and closes the prompt, on failure calls `reportCodePromptError` so the dialog stays open.
- **`revealedBackupCodes` (local ref)** — holds one-time backup codes after first-enrollment or regeneration. Intentionally kept out of the Pinia store ("never park a secret in a store" idiom).
- **`enrolling` (local ref)** — which method is currently open in `TwoFactorEnroll.vue`; `undefined` when closed.
- **`pendingSetup` (local ref)** — the `TwoFactorSetup` payload from `setupMethod`, passed to the enrollment dialog so it resumes rather than re-initialising.
- **`deliveredMethod` / `sendProofCode()`** — finds the first armed method with `delivers: true` and mails a proof code into the open code prompt (refusal stays in the prompt via `reportCodePromptError`).
- **`availableToEnroll` / `unavailable` (computed)** — split `status.available` on the server's `enrollable` flag; never inspects the method name locally.
- **`useReturnFocus`** — three instances restore focus to the trigger control when the enroll, backup-codes, or code-prompt dialog closes.

## Relationships

- **`two-factor.ts` store** — primary data source; `fetchStatus` is called on mount, and all mutations (`removeMethod`, `disableAll`, `setupMethod`, `regenerateBackupCodes`, `sendMethodCode`, `clearSetup`) are dispatched through it.
- **`use-method-label.ts`** — provides `methodLabel()` used in confirm-dialog copy and success toasts.
- **`TwoFactorEnroll.vue`** — child dialog for the enrollment/setup flow; receives `pendingSetup` and emits `close` with optional backup codes via `handleEnrollClose`.
- **`TwoFactorBackupCodes.vue`** — child dialog that reveals `revealedBackupCodes`; emits a done event handled by `handleBackupCodesDone`.
- **`Profile.vue`** — parent view that renders this component and gates it behind `ReauthDialog.vue` fresh-auth before any mutation is reachable.
- **`two-factor-view.spec.ts`** — unit-test suite covering this component's behaviour.
- **`@/infrastructure/utils/use-blocking-error.ts`** — provides the `useBlockingError` composable that keeps errors visible inside the code-prompt dialog rather than in the toast queue.

## Notes

- The file uses a separate non-`setup` `<script>` block solely to set `name: 'ProfileTwoFactor'`, because `<script setup>` cannot declare a component name. This is needed for `<KeepAlive>` and devtools.
- A wrong code or any other failure **never** toasts; it is reported via `useBlockingError` so the dialog stays open for a retry. This is a deliberate contrast with the success path, which *does* toast.
- `openEnroll` reads `status.value.methods` to decide "first factor vs. replace vs. add" rather than accepting a boolean from the caller, avoiding a single-source-of-truth mismatch.
- `enrollable` and `delivers` are server-driven flags; the component intentionally avoids hard-coding method-name checks so new methods added server-side require no code change here.
- Backup codes live in a local `ref`, not in the Pinia store, matching the same "don't park one-time secrets in a store" pattern used by `api-keys` and `webhooks`.
