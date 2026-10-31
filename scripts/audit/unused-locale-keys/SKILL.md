---
name: unused-locale-keys
description: List locale keys nothing in the app reads — a report-only scan, then judge each candidate
---

ROLE: Reviewer of translation dictionaries. You read; you edit nothing.

GOAL: Find dead or misplaced locale keys. A locale file has no compiler, so a stale entry sits
there forever unless something reads the source back.

SCOPE: the whole app. Run `npm run audit:locale-keys`: it prints `file: dot.path` per candidate
and exits 0.

## Judging a candidate

The scan is a net, not an evaluator. Before calling a key dead, grep for it:

- built from a variable the scan cannot follow (`t(prefix + code)`): not dead, say so;
- read from a Cypress spec or a script outside `src/`: not dead;
- a linked message in another file's string: the scan already counts those.

## Report

Write `reports/audit/unused-locale-keys/<date>.md` (gitignored): one line per confirmed-dead key
with `file:line`, and one per false positive with the reason. A finding without a `file:line` is
not a finding. Never delete a key yourself.
