---
source: tests/e2e/specs/journeys/ac13-my-password-start-to-finish.cy.ts
sha256: fe7635dfcaafdfa7c186ee8e18fe5894665448f9090dd65de44426c6f207d242
signature: b02c58f35ffd6a8faf38c27b2422a2a174f94e94a66839e55d3fb847ca331aa6
generated_at: 2026-11-10T06:45:13.278696+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac13-my-password-start-to-finish.cy.ts

## Purpose

End-to-end journey test for the full password lifecycle (AC13): changing a password from the profile page, recovering it via a mailed reset link, and verifying the failure modes along the way (breached-password warnings on all three forms, wrong-current-password rejection, single-use reset links, device sign-out on change and reset, and indistinguishable acknowledgement for unknown addresses).

## Key elements

- **`BREACHED` / `CHANGED` / `RESET`** – Constant passwords used throughout the journey. `BREACHED` (`Password1!`) is on the backend's bundled breach list yet passes composition rules; the others are unique to the test.
- **`submitPasswordChange(current, next)`** – Fills the three profile password fields (`[data-test=current-password]`, `new-password`, `new-password-confirm`) and clicks submit.
- **`expectResetNoticeMailed(address)`** – Asserts the `account.reset-confirm` template was sent. Skipped when `liveProfile` is `true` (live Mailpit inbox has no template metadata).
- **`firstResetLink`** – Module-level mutable holding the URL of the first reset mail so a second request in the same inbox can be filtered apart via `carriesAnotherLink`.
- **Test: "a change and a reset each replace the password and sign the other devices out"** – The main journey. Gated by `cy.skipUnlessMailbox()`. Exercises: breach warning on change form → refused submit → wrong current password → valid change + device 401 → old login rejected / new login accepted → reset request → reset page breach warning → reset submit + notice mail + device 401 → link reuse rejected → old password dead / reset password works → reset while still signed in signs out → unknown address gets same acknowledgement.
- **Test: "the signup form warns about a breached password as it is typed"** – Standalone check that the signup password field shows `[data-test=password-breach-warning]` while typing `BREACHED`.

## Relationships

| Neighbor | Interaction |
|---|---|
| `tests/support/e2e/harness.ts` | Imports `loginDevice` (signs in a second device, returns its phone id) and `refreshDevice` (issues a refresh-token request whose 401 status is the "signed out" signal). |
| `tests/support/e2e/steps.ts` | Imports `carriesAnotherLink` – a mail-filter predicate that matches a reset mail whose link differs from a previously seen one. |
| `tests/support/e2e/security-steps.ts` | Imports `loginDeviceWith`, `requestReset`, `submitLoginForm`, `submitReset` – reusable login/reset form interactions. |
| `tests/support/e2e/commands.ts` | Imports `byTemplate` (mail template matcher), `expectMailTemplate` (asserts template name), `mailedLinkUrl` (extracts the URL from a mail body). |
| `scripts/e2e/mail-filters.ts` | Likely origin of the filter predicates (`byTemplate`, `carriesAnotherLink`) surfaced through the above modules; used to disambiguate reset mails in a shared inbox. |

## Notes

- The file header declares `requires-module: account`; without the account module the spec cannot run.
- `firstResetLink` is **module-scoped mutable state**. It is written once (first reset mail) and read later (second reset mail filter). If the main test is restructured or a second `it` block requests a reset, this variable's assumption breaks.
- `expectResetNoticeMailed` silently no-ops in live mode (`liveProfile === true`) because a real SMTP inbox carries only rendered HTML, not a `template` field.
- The breached-password assertion deliberately checks for the human-readable API phrase (`"data breach"`) and asserts the raw HTTP status word (`"Unprocessable Entity"`) is **not** shown – a UI-presentation invariant.
- The "signed in, still" reset scenario (final step of the main test) issues a raw `cy.request` POST to `/account/password/reset` rather than using `requestReset`, because the UI flow would log the user out first.
