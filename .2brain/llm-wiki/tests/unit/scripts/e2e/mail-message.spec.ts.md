---
source: tests/unit/scripts/e2e/mail-message.spec.ts
sha256: 70a7c89977ae0944144d4faa23f34ae111990b62e37ec15bc71563cfd5a55abc
generated_at: 2026-10-17T02:43:07.470020+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/mail-message.spec.ts

## Purpose

Unit tests for the two mail-parsing helpers that E2E specs use to read delivered emails back into a flat, assertable shape. Verifies that `parseMailpitMessage` correctly extracts sign-in codes, password-reset links with tokens, plain-text bodies, and attachment file names from a rendered Mailpit message, and that `mailMentions` performs whitespace-insensitive substring matching across both inbox and outbox representations.

## Key elements

- **`describe('parseMailpitMessage')`** — four cases: lifting a six-digit code from HTML, preserving a full link URL and decoding its `#token` fragment, preferring the plain-text body over HTML when both are present, and returning empty `lines` / undefined `token` when the message carries neither.
- **`describe('parseMailpitMessage — attachments and text')`** — three cases: listing attachment file names while retaining visible text, collecting every `<a href>` into `links`, and asserting the `attachments` key is entirely absent (not just empty) when no attachments exist.
- **`describe('mailMentions')`** — three cases: finding a needle in both inbox (`text` field) and outbox (`lines` field) shapes, matching despite internal whitespace differences, and returning `false` when the needle is not present.
- **Imports** — `describe`, `expect`, `it` from `vitest`; `mailMentions`, `parseMailpitMessage` from `../../../../scripts/e2e/mail-message`.

## Relationships

- **`scripts/e2e/mail-message.ts`** (the only graph neighbor): this spec is its dedicated unit-test suite. It imports and exercises both exported functions; no other module is referenced.

## Notes

- The file lives under `tests/unit/scripts/e2e/` — it is a **unit** test for E2E *tooling*, not an E2E spec itself.
- `parseMailpitMessage` deliberately **omits** the `attachments` key (rather than setting it to `[]`) when a message has no attachments; one test asserts `not.toHaveProperty('attachments')` to lock in that convention.
- `mailMentions` is whitespace-tolerant by design: reference codes are rendered with different grouping in HTML vs. plain text, so the matcher strips/collapses whitespace before comparing.
- The "outbox shape" produced by the parser is a flat object: `{ to, subject, lines[], token?, links?, text?, attachments? }` — specs assert against this shape rather than raw HTML.
