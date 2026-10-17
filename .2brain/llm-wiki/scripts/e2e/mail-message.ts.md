---
source: scripts/e2e/mail-message.ts
sha256: b15249254cb00cddbb5bce4802c86debbaaaafe49a2689b9dae973ec9c195b61
generated_at: 2026-10-17T00:00:34.034432+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/mail-message.ts

## Purpose

Normalises a Mailpit SMTP message into the same `MailedEmail` shape the demo outbox already provides, so e2e journey specs can assert on email content without caring which profile (demo backend vs. live SMTP/Mailpit) delivered it. Pure parsing logic with no browser dependency.

## Key elements

- **`MailedEmail`** (exported interface) — the unified email shape specs consume: `to`, `subject`, optional `template`, `token`, `lines`, `text`, `links`, `attachments`.
- **`MailpitMessage`** (exported interface) — the subset of Mailpit's `GET /api/v1/message/{ID}` response this module reads (`HTML`, `Text`, `Subject`, `Attachments`).
- **`parseMailpitMessage(to, message)`** (exported) — converts a `MailpitMessage` into a `MailedEmail`: extracts a 6-digit 2FA code, finds the first `#token=` link, collects all `href`s, strips HTML to visible text, and lists attachment file names.
- **`mailMentions(email, needle)`** (exported) — whitespace- and case-insensitive check whether a `needle` string appears anywhere in the email's `lines`, `links`, `text`, or `subject`. Used by specs to assert "does the email carry X?" without profile-specific logic.
- **`visibleText(html)`** (internal) — strips tags, `<style>` blocks, decodes `&amp;`, collapses whitespace.
- **`actionLink(html)`** (internal) — returns the first `href` containing `#token=`, with entities decoded.
- **`CODE_PATTERN`**, **`HREF_PATTERN`** (internal regexes) — six-digit code and all `href` extraction.

## Relationships

- **`tests/support/e2e/commands.ts`** — the Cypress commands that fetch from Mailpit call `parseMailpitMessage` before handing the result to specs.
- **`tests/support/e2e/steps.ts`** — step helpers for journeys consume the `MailedEmail` shape and call `mailMentions` for assertions.
- **`tests/unit/scripts/e2e/mail-message.spec.ts`** — unit-tests `parseMailpitMessage` and `mailMentions` in a Node environment (no browser).
- **Journey specs** (`ac6`, `cu1`, `cu3`, `cu16`, `n1`, `n2`, `op1`, `op17`, `op9`, `vi3`) — all import `mailMentions` / the `MailedEmail` shape via the support layer to verify email content (2FA codes, tracking links, confirmation text) without branching on profile.

## Notes

- Deliberately lives in `scripts/e2e/` rather than `tests/support/e2e/` so the unit spec can import it without pulling in Cypress or a browser context.
- `template` on `MailedEmail` is always `undefined` for SMTP-delivered mail; only the demo outbox populates it.
- `token` is `decodeURIComponent`-ed on extraction; raw `lines` are left as-is.
- The six-digit code regex requires the digits to be flanked by whitespace or string boundaries, avoiding false matches inside longer numbers.
