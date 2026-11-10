---
source: src/modules/account/components/ProfilePasswordChange.vue
sha256: 12dddb23390d277e56e70922190f116287e6d308dc7c7ce01259b4925a6f02ff
signature: 12dddb23390d277e56e70922190f116287e6d308dc7c7ce01259b4925a6f02ff
generated_at: 2026-11-10T03:21:25.818890+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfilePasswordChange.vue

## Purpose

Collapsible form that lets a user change their password live (current-password proof, no email round-trip). It sits behind a toggle on the profile page so the page does not render three forms open at once. Validation is handled client-side via zod + `useStructureFormValidation`; submission errors that are field-mappable are applied to fields, and anything else blocks the form in place via `useBlockingError` rather than toasting.

## Key elements

- **`export default { name: 'ProfilePasswordChange' }`** — Named-block for devtools / `<KeepAlive>`; required because `<script setup>` cannot declare a name.
- **`showChangePassword` (ref)** — Toggle state; controls the `v-expand-transition` / `v-show` and gates inline error visibility (`showPasswordErrors`).
- **`passwordForm` / `passwordErrors` / `handleSubmit` / `applyServerErrors`** — Destructured from `useStructureFormValidation`. The zod schema enforces non-empty current/new/confirm fields (messages via `t()`) and a `superRefine` that adds a custom issue on `passwordConfirm` when it does not match `password`. `revalidateOn: locale` re-runs validation on language change.
- **`submitPasswordChange`** — Calls `handlePasswordSubmit`, then invokes `changePassword` from the profile store. On success: toasts, clears all three fields, collapses the form, and fires a best-effort `fetchSessions()`. On failure: `applyServerErrors` maps known codes to fields; `onUnmapped` routes to `reportPasswordChangeError`.
- **`passwordChangeError` / `reportPasswordChangeError` / `clearPasswordChangeError`** — From `useBlockingError`; rendered by `<InlineErrorAlert>` at the bottom of the form.
- **`passwordBreached` / `checkPasswordBreach`** — From `usePasswordBreachCheck`; a `watch` on the new-password field triggers the (debounced) lookup. The result only drives an advisory `<v-alert>` and **never** blocks submission.
- **`PasswordStrengthMeter`** — Display-only meter bound to the new-password field.
- **`fieldErrorProps`** — Shared helper that converts an array of field-error strings into Vuetify `v-text-field` props (`error`, `error-messages`).

## Relationships

- **`src/modules/account/views/Profile.vue` (parent view)** — Hosts this component in the profile page layout; passes no props. This component manages its own visibility toggle.
- **`src/modules/account/stores/profile.ts`** — Consumes `changePassword(currentPassword, password, passwordConfirm)` to perform the actual mutation.
- **`src/modules/account/stores/sessions.ts`** — Calls `fetchSessions()` after a successful change (fire-and-forget, `.catch(() => undefined)`) because a live password change revokes other sessions server-side.
- **`src/modules/account/composables/use-password-breach-check.ts`** — Provides `breached` and `check`; this component only renders the advisory warning and never gates on it.
- **`src/modules/account/components/PasswordStrengthMeter.vue`** — Rendered inside the form below the new-password field; receives the raw password string.
- **`src/modules/account/tests/password-breach-hint.spec.ts`** — Exercises the advisory breach-alert path (`data-test="password-breached-warning"`).
- **`src/modules/account/tests/password-change-sessions-refresh.spec.ts`** — Verifies that `fetchSessions` is called after a successful `changePassword` and that a failing refresh does not surface as a form error.

## Notes

- **Two-script SFC pattern:** The plain `<script>` block exists solely to set `name`; all logic lives in `<script setup>`. Do not merge them.
- **`superRefine` vs. `refine`:** The confirm-match check uses `superRefine` so it runs at parse time inside the same `z.object`; the `t()` call inside it is already resolved at that point, so no lazy thunk is needed.
- **Error strategy is intentional:** Field-mappable server errors → per-field messages via `applyServerErrors`; everything else → `useBlockingError` (inline `<InlineErrorAlert>`). Success and generic "fix errors" still use `addMessage` (toast). This split is documented in `docs/theory/request-flow.md`.
- **`fetchSessions` is deliberately isolated:** It is wrapped in `Promise.resolve().then(...).catch(() => undefined)` so a refresh failure (or a synchronous throw) can never be caught by the form's own `.catch` and misreported as a password-change error.
- **Breach check is advisory only:** The four server-side password-SET endpoints remain the authority. The warning alert is never a submit gate and should never be wired into validation logic.
