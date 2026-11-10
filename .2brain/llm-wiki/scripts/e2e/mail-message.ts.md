---
source: scripts/e2e/mail-message.ts
sha256: 7426cfaeab69ed49911b36487623f6fbf27135ee2fe9fff7072be8c1b12567bc
signature: e2ef6acf8e1401740215a98071c847185a7c70711586b41b5c4ffdf563284002
generated_at: 2026-11-10T02:34:17.628903+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/mail-message.ts

## Purpose

Normalises a Mailpit (SMTP) email into the same `MailedEmail` shape the demo outbox produces, so e2e journey specs can assert against either backend without branching. It is a pure module kept outside `tests/support/e2e/` so the unit suite can pin the parsing logic without a browser.

## Key elements

- **`MailedEmail`** (interface) – The unified email shape specs consume. `template` and `locale` are optional (demo-only); `token`, `lines`, `text`, `links`, and `attachments` are filled in by the parser.
- **`MailpitMessage`** (interface) – The subset of Mailpit's `GET /api/v1/message/{ID}` response this module reads (`HTML`, `Text`, `Subject`, `Attachments`).
- **`parseMailpitMessage`** (exported function) – Main entry point. Accepts a recipient address and a `MailpitMessage`, returns a `MailedEmail`. Extracts the 6-digit 2FA code, the first `#token=`-bearing link, all `href` values, attachment file names, and visible text.
- **`mailMentions`** (exported function) – Whitespace-insensitive, case-insensitive check whether a `needle` appears anywhere in the email (lines, links, text, or subject). The single predicate specs use to ask "does this email carry X?" regardless of profile.
- **`visibleText`** (internal) – Strips `<style>` blocks and HTML tags, decodes `&amp;`, folds whitespace.
- **`actionLink`** (internal) – Returns the first `href` containing `#token=`, with `&amp;` decoded.
- **`CODE_PATTERN` / `HREF_PATTERN`** (internal regexes) – Match a standalone six-digit code and every `href="…"` in HTML, respectively.

## Relationships

- **Journey spec files** (`ac21-it-was-not-me`, `ac22-i-disconnected-the-provider`, `ac6-give-me-my-data`, `cu1-first-purchase`, `cu16-a-whole-purchase-in-italian`, `cu3-bank-transfer`, `in1-a-key-does-what-it-was-given`, `n1-withdraw-before-dispatch`, `op1-fulfill-paid-order`, `op17-warehouse-shift`, `op22-defective-item-comes-back`, `op24-ship-in-two-goes`, `op25-hold-release`, `op30-correct-a-tracking-code`) – Import `mailMentions` (and the `MailedEmail` type) to assert on email content after triggering a send.
- **`scripts/e2e/mail-filters.ts`** – Sibling module in the same e2e script directory; provides complementary mail-related helpers used alongside this file in the same specs.

## Notes

- `lines` uses the exact `code: <digits>` / `linkUrl: <url>` format the demo outbox records, so specs can index by position or pattern regardless of profile.
- `token` is URI-decoded on output (`decodeURIComponent`), so specs compare against the raw token value.
- `attachments` contains only file names, never bytes, and the key is omitted entirely when there are no attachments (vs. an empty array).
- The module is intentionally pure — no I/O, no Cypress API calls. The actual Mailpit HTTP fetch lives in `tests/support/e2e/commands.ts`.
