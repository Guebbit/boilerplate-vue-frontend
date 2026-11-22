---
name: audit-css-invasive
description: Judge invasive, exaggerated or over-complicated CSS against Vuetify and Tailwind, beyond what `npm run audit:css` gates
argument-hint: <module|path|--diff|whole-repo>  (default: whole-repo)
allowed-tools: Read, Glob, Grep, Write, Agent, Bash(npm run audit:css:*), Bash(npm run -s audit:css:*), Bash(npx vitest run tests/cross-cutting/*), Bash(git diff:*), Bash(git status:*), Bash(git branch --show-current), Bash(ls:*), Bash(2brain query:*), Bash(npm run audit:check-clean:*)
---

Read `scripts/audit/css-invasive/SKILL.md` and follow it. The scope is: $ARGUMENTS

The audit lives under `scripts/audit/` so any AI tool can run it; this file only registers it with
Claude Code. See `docs/build/ai-auditing.md` and `docs/build/design-lint.md`.
