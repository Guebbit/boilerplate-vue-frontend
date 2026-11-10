---
source: tests/unit/scripts/e2e/mail-filters.spec.ts
sha256: 4f2784722033cff660654c0bc66afe8c5e12ef138f07b5f271c60a775df85b6c
signature: 4f2784722033cff660654c0bc66afe8c5e12ef138f07b5f271c60a775df85b6c
generated_at: 2026-11-10T08:16:55.657473+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/mail-filters.spec.ts

## Purpose

Vitest unit tests for the three email-matching helpers exported by `scripts/e2e/mail-filters.ts`. They pin down the selection semantics E2E specs rely on when picking "the" email from a profile that may be ambiguous (multiple templates, locales, or order numbers).

## Key elements

- **`describe('byTemplate')`** — Verifies that `byTemplate(name)` keeps the email whose `template` equals `name`, drops others, and lets emails with *no* `template` field (inbox-style mail) pass.
- **`describe('inLocale')`** — Verifies that `inLocale(code)` matches on the recorded `locale`, falls back to a case-sensitive substring of `subject` when a fallback string is supplied, and matches any email when neither `locale` nor a fallback is present.
- **`describe('mailAbout')`** — Verifies that `mailAbout(subjectFragment, orderNumber)` requires *both* the fragment in the subject **and** the order number (in subject or `lines`) to be present simultaneously; a correct subject with the wrong order (or vice-versa) is rejected.

## Relationships

- **`scripts/e2e/mail-filters.ts`** — The sole production dependency. This spec imports `byTemplate`, `inLocale`, and `mailAbout` from it and asserts their return values (boolean matchers) against minimal email-shaped objects.

## Notes

- Test email fixtures are inline literals (`{ to, subject, template?, locale?, lines? }`); there is no shared fixture factory.
- The "pass-through" behaviours (no template → true, no locale + no fallback → true) are intentional: they let a spec degrade gracefully when the profile doesn't record the discriminator.
- `mailAbout` is conjunctive, not disjunctive — both arguments must be found somewhere in the email (subject or `lines`). This is the key distinction from `byTemplate`/`inLocale`, which are single-criterion filters.
