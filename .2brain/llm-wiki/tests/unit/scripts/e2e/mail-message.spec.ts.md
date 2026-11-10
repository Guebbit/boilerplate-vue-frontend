---
source: tests/unit/scripts/e2e/mail-message.spec.ts
sha256: 70a7c89977ae0944144d4faa23f34ae111990b62e37ec15bc71563cfd5a55abc
signature: 70a7c89977ae0944144d4faa23f34ae111990b62e37ec15bc71563cfd5a55abc
generated_at: 2026-11-10T08:17:06.271846+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/mail-message.spec.ts

## Purpose

Unit tests (Vitest) for the two helpers in `scripts/e2e/mail-message.ts` that E2E flows use to read rendered email back into a normalized "outbox" shape. They verify that the six-digit sign-in code, the exact reset link (token intact), plain-text preference, attachments, and the `mailMentions` substring search all behave correctly when fed realistic Mailpit message objects.

## Key elements

- **`describe('parseMailpitMessage')`** — Four cases: code extraction from HTML, link + token preservation, plain-text (`Text` field) taking priority over `HTML`, and the "neither code nor link" empty case (empty `lines`, `token` undefined).
- **`describe('parseMailpitMessage — attachments and text')`** — Attachment `FileName` arrays land in `email.attachments`; visible text lands in `email.text`; all `<a href>` values are collected into `email.links`; when `Attachments` is an empty array the `attachments` key is **absent** (not `[]`).
- **`describe('mailMentions')`** — Substring search that works across both inbox-style (`text`) and outbox-style (`lines`) email shapes; whitespace-insensitive; returns `false` when the needle is absent.

## Relationships

- **`scripts/e2e/mail-message.ts`** — Sole import target. This spec exercises its two exports (`parseMailpitMessage`, `mailMentions`) and no other module.
- **Vitest** (`vitest`) — Provides `describe`, `it`, `expect`; no custom test helpers or fixtures are used.

## Notes

- The "outbox shape" is the contract E2E specs consume: `{ to, subject, lines, token?, links?, text?, attachments? }`. Tests assert exact key presence/absence (e.g. `not.toHaveProperty('attachments')`), so adding a key with a default value would break them.
- `mailMentions` treats whitespace as a no-op when comparing, so reference codes with inconsistent spacing still match. This is intentional per the test's "ignores whitespace" case.
- The token test uses a URL-encoded fragment (`#token=abc%2Fdef`) and expects the **decoded** value (`abc/def`) in `email.token` while the full URL is kept verbatim in `lines`.
