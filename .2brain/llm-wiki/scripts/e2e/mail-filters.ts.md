---
source: scripts/e2e/mail-filters.ts
sha256: a134a418e9b3c097af5b155760511229671b231615cad52a3562ae785deec633
signature: 9269b7d2b408cdb7d0efe097e1d6bd89b17cab0c97114d7aab93705a9ff870ea
generated_at: 2026-11-10T02:34:02.180892+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/mail-filters.ts

## Purpose

Provides pure predicate functions that filter an address's mailbox down to the one email a spec is waiting for. Because the demo outbox records template and locale metadata while a live SMTP inbox records neither, every matcher explicitly defines its fallback when those fields are absent, so a single spec runs unchanged on both profiles. Kept outside `tests/support/e2e/` so the unit suite can assert matcher rules without a browser.

## Key elements

- **`byTemplate(name: string)`** — Returns a `(email: MailedEmail) => boolean` that is true when the email's `template` equals `name`, *or* when `template` is `undefined` (live inbox has no template). Used to select an email by its outbox template key (e.g. `orders.order-confirm`).
- **`inLocale(tag: string, liveSubject?: string)`** — Returns a matcher true when `email.locale === tag`. If `locale` is `undefined` (live inbox), falls back to checking that the subject contains `liveSubject`; if `liveSubject` is also omitted, the email passes unconditionally.
- **`mailAbout(subject: string, orderNumber: string)`** — Returns a matcher true when the subject contains `subject` (case-insensitive) **and** the email body mentions `orderNumber` (via `mailMentions`). Designed to be stable across module refactors that change sender or template key.

## Relationships

- **`scripts/e2e/mail-message.ts`** — Direct import source: provides the `MailedEmail` type and the `mailMentions` helper used by `mailAbout`.
- **`tests/e2e/specs/journeys/ac1-lost-my-phone.cy.ts`, `ac13-my-password-start-to-finish.cy.ts`, `ac21-it-was-not-me.cy.ts`, `ac22-i-disconnected-the-provider.cy.ts`, `ac24-someone-is-guessing-my-codes.cy.ts`, `cu16-a-whole-purchase-in-italian.cy.ts`, `fr17-switch-language-mid-checkout.cy.ts`, `in1-a-key-does-what-it-was-given.cy.ts`, `op1-fulfill-paid-order.cy.ts`, `op24-ship-in-two-goes.cy.ts`, `op30-correct-a-tracking-code.cy.ts`, `op31-a-refund-the-provider-refuses.cy.ts`, `op36-the-payments-pages-two-doors.cy.ts`, `op40-the-shop-in-two-languages.cy.ts`** — Consumer specs. Each imports one or more of the three matchers and passes the resulting predicate to the `emailTo` command to select the correct email among an address's messages.

## Notes

- All three matchers are **curried**: the outer call takes the spec's parameters and returns a plain `(email) => boolean`, which is what `cy.emailTo` expects as its second argument.
- `byTemplate` and `inLocale` intentionally *pass* live-inbox emails that carry no metadata rather than rejecting them; tightening is left to the other matchers in the spec's filter chain (e.g. `mailAbout`).
- `mailAbout` does the only case-insensitive comparison in the module (lowercases both sides of the subject check). The other two matchers compare exact strings.
- The file is pure (no side effects, no Cypress imports), which is what allows the unit test suite to pin matcher semantics without a browser.
