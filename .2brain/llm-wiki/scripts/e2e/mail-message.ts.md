---
source: scripts/e2e/mail-message.ts
sha256: e65fca756db772f756bdbbb3b392df572c2341a49b9764d1f824eb200ff0ef80
generated_at: 2026-10-02T14:34:06.695647+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/mail-message.ts

## Purpose

Normalises a Mailpit (SMTP) email into the same `MailedEmail` shape the demo outbox already provides, so e2e specs can assert against both backends without branching. Keeping the parsing pure and outside `tests/support/e2e/` lets the unit suite exercise it without a browser.

## Key elements

- **`MailedEmail`** (interface) — The unified shape specs consume. Carries `to`, `subject`, optional `template`, `token`, `lines` (demo-style `key: value` pairs), `text`, `links`, and `attachments`.
- **`MailpitMessage`** (interface) — The subset of Mailpit's `GET /api/v1/message/{ID}` response this module reads: `HTML`, `Text`, `Subject`, `Attachments`.
- **`parseMailpitMessage(to, message)`** (exported) — Converts one Mailpit message into a `MailedEmail`. Extracts the 6-digit code from visible text, finds the first `href` carrying `token=`, collects all links, and mirrors the demo `lines` array.
- **`mailMentions(email, needle)`** (exported) — Case- and whitespace-insensitive "does this email mention X?" check across `lines`, `links`, `text`, and `subject`. Single assertion point for both profiles.
- **`visibleText(html)`** (internal) — Strips tags/`<style>`, decodes `&amp;`, collapses whitespace.
- **`actionLink(html)`** (internal) — Returns the first `href` containing `token=`, with entities decoded.
- **`CODE_PATTERN` / `HREF_PATTERN`** (internal regexes) — Match a standalone 6-digit code and all `href` attributes, respectively.

## Relationships

- **`tests/support/e2e/commands.ts`** — The Cypress command that fetches a Mailpit message and calls `parseMailpitMessage` lives here; this file supplies the pure parsing it delegates to.
- **`tests/support/e2e/steps.ts`** — Journey-step helpers that assert on emails use `mailMentions` and the `MailedEmail` shape.
- **Journey specs** (`cu1-first-purchase`, `cu3-bank-transfer`, `cu16-…`, `n1-…`, `n2-…`, `op1-…`, `op9-…`, `vi3-…`) — Each calls `mailMentions` (via steps or directly) to verify a token, tracking code, or link is present in the received email, regardless of whether the demo outbox or Mailpit produced it.
- **`tests/unit/scripts/e2e/mail-message.spec.ts`** — Unit-tests `parseMailpitMessage` and `mailMentions` in isolation (no browser, no Mailpit server).

## Notes

- The file is deliberately **not** under `tests/support/e2e/` so the unit spec can import it without pulling in Cypress globals or the browser runtime.
- `mailMentions` compares with **all whitespace removed and lowercased** (`squash`), so specs can pass `"Tracking: 123456"` or `"tracking 123456"` interchangeably.
- `token` is `decodeURIComponent`-ed in `parseMailpitMessage`; if the link contains URL-encoded values the spec sees the decoded form.
- The `lines` array is always present (may be empty), while `template`, `attachments`, and `links` are omitted when empty — mirror that when comparing objects in assertions.
