---
source: src/modules/account/components/LinkTokenConfirmCard.vue
sha256: 54193c24b5b94bb0c83dab8de63ec7c89fe29caedc4544fcf98642ea096a1869
signature: 54193c24b5b94bb0c83dab8de63ec7c89fe29caedc4544fcf98642ea096a1869
generated_at: 2026-11-10T03:19:15.699058+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/LinkTokenConfirmCard.vue

## Purpose

A single reusable card for every "the email link is the credential" confirmation page. The owning page supplies its wording, `data-test` hooks, the store call that spends the token, and the post-success route; the card handles everything shared — reading the token from the URL `#fragment`, scrubbing it from the URL, Zod validation, the submit toast, in-place error display, and the redirect. It renders a submit button (not an auto-fire) so a mail scanner prefetching the URL cannot spend the token before a human acts.

## Key elements

- **Props (`copy`, `testIds`, `spend`, `successRoute`, `destructive?`)** — Full i18n translation keys for every string, e2e test selectors, the async token-spending callback, the named route to navigate to on success (`'Home'` or `'Login'`), and a flag that switches the submit button to a destructive (error) colour.
- **`submitForm`** — Clears any prior blocking error, runs `useStructureFormValidation`'s `handleSubmit`, calls `props.spend(token)`, toasts on success and navigates via `routerLinkI18n`. On rejection, maps server errors to fields or falls back to `reportSpendError` (inline alert next to the button).
- **`useLinkTokenCleanup(route, router)`** — Strips the `#token=` fragment from the URL after mount so it stops propagating into pageview/observability events (Umami, Faro) and browser history.
- **`readLinkToken(route)`** — Extracts the token from the current route's hash fragment to prefill the form.
- **`useBlockingError()`** — Provides `spendError` / `spendErrorType` / `report` / `clear` for token-spending rejections that name no form field (e.g. "token already used"), rendered as an `InlineErrorAlert` below the button.
- **`<slot name="footer">`** — Page-owned escape hatch (e.g. a back link).
- **Template** — Wraps everything in `FormCard` (size `md`); optional `v-alert` warning and intro paragraph above the field; single `v-text-field` bound to `form.token`; `InlineErrorAlert` in the `#after-submit` slot.

## Relationships

- **`AccountRestore.vue`, `EmailChangeConfirm.vue`, `EmailChangeUndo.vue`, `TwoFactorChallenge.vue`, `VerifyEmailConfirm.vue`** — All five consume this card, each passing its own `copy`, `testIds`, `spend` callback, and `successRoute`. They are the "email-link token" confirmation pages in the account module.
- **`src/infrastructure/utils/logger.ts`** — Transitive dependency (reached through `use-blocking-error.ts` / `@guebbit/vue-toolkit` internals); not imported directly by this component.

## Notes

- All i18n keys in `props.copy` are **full literal keys** (not prefixes) on purpose: the unused-key sweep and a plain `grep` must each find them without prefix matching.
- The `spend` prop is typed `(token: string) => Promise<unknown>`. The component does not inspect the resolution value; any rejection is treated as a failure.
- `router.push`'s resolved value is explicitly swallowed (`.then(() => undefined)`) because a failed navigation is the router's own `onError` concern, not this form's.
- `formElement` is resolved through a template ref (`card.value?.formElement`); a TypeScript-ESLint disable is required because the SFC `InstanceType` cannot be fully resolved by the linter.
- `revalidateOn: locale` means the Zod schema (and its error messages) re-run whenever the active locale changes.
