---
source: src/modules/account/views/Login.vue
sha256: 034ba4909efb30e4620dc4ee9c102b303730418959dae736ac38ad3ed395acc9
generated_at: 2026-10-02T12:36:24.057209+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Login.vue

## Purpose

The primary authentication entry point for the application. Renders an email/password form, validates it against a Zod schema derived from the shared `usersSchema`, and dispatches the result through one of three branches: a plain post-login redirect, a hand-off to the `TwoFactorChallenge` view, or an inline anti-bot (HumanCheck) challenge. Also surfaces available OAuth providers as top-level navigation links.

## Key elements

- **`submitForm`** — Orchestrates the login: clears prior blocking errors, runs Zod validation via `useStructureFormValidation`, calls `useAuthStore().login(…)` with the optional anti-bot token, then branches on the `LoginOutcome` kind (`mfa` → push `TwoFactorChallenge`; otherwise → `redirectAfterLogin`). Catches `ANTIBOT_VERIFICATION_FAILED` to toggle the HumanCheck widget; maps 422 field errors via `applyServerErrors`; maps unmapped 401s to the inline `loginError` alert.
- **`loginSchema`** — `usersSchema.pick({ email }).extend({ password: z.string().min(8) })`. Messages are thunks so they pick up the active locale at parse time.
- **`form` / `formErrors` / `handleSubmit` / `applyServerErrors`** — Supplied by `useStructureFormValidation` (`@guebbit/vue-toolkit`). `revalidateOn: locale` re-translates errors already rendered.
- **`loginError` / `reportLoginError` / `clearLoginError`** — From `useBlockingError`; renders as `InlineErrorAlert` pinned below the submit button rather than in the toast queue.
- **`humanCheck` (ref) + `requiresHumanCheck` (ref)** — Conditionally mounts `HumanCheck` when the server returns an anti-bot refusal; the solved token is read via `humanCheck.value?.token` on retry.
- **`oauthProviders` (computed from store) + `continueTo` (computed)** — OAuth buttons render as `<a href>` links (real top-level navigation). `continueTo` forwards the same-origin `?continue=` query param into the OAuth start URL.
- **`redirectAfterLogin`** — From `usePostLoginRedirect`; sends the user to their pre-login destination after a successful non-MFA auth.
- **`showPassword`** — Toggles the password field between `type="password"` and `type="text"`.

## Relationships

- **`src/modules/account/views/TwoFactorChallenge.vue`** — When the auth store's `login()` resolves with `outcome.kind === 'mfa'`, this view pushes `routerLinkI18n({ name: 'TwoFactorChallenge', query: route.query })` and seeds the two-factor store via `useTwoFactorStore().beginLoginChallenge(outcome, remember)`. The visitor then completes the challenge on that page.
- **`src/infrastructure/utils/logger.ts`** — Indirect (transitive) dependency, likely pulled in through `useAuthStore`, `useTwoFactorStore`, or the HTTP layer. No direct `import` of `logger.ts` appears in this file.

## Notes

- **OAuth links must be real `<a href>` elements.** A `RouterLink` or `@click` handler cannot initiate the top-level navigation the OAuth redirect flow requires; `v-btn`'s `href` prop is used for this reason.
- **`remember` field mismatch.** The form binds a plain boolean; the API contract (`LoginRequest`) expects a tier string. The auth store performs the mapping — the form deliberately types its model as `Omit<LoginRequest, 'remember'> & { remember?: boolean }`.
- **Anti-bot retry keeps the form filled.** On `ANTIBOT_VERIFICATION_FAILED` the form values are left in place so the visitor can solve the HumanCheck and re-submit without re-typing credentials.
- **`void useOAuthProvidersStore().fetchProviders()`** is fire-and-forget; the store is documented as idempotent on re-mount, so a second visit does not re-fetch.
- **ESLint disable on `humanCheck.value?.token`** — TypeScript-ESLint cannot resolve the SFC instance type of `HumanCheck` through `InstanceType<typeof …>`, so the unsafe-argument/unsafe-member-access rules are suppressed with an explanatory comment.
