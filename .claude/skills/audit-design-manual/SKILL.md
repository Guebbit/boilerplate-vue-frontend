---
name: audit-design-manual
description: Judge the rendered design, from screenshots and source, for what no automated check can see
argument-hint: <module|path|shell|--diff>  (default: the whole app)
allowed-tools: Read, Glob, Grep, Write, Agent, Bash(npm run audit:design:*), Bash(npm run -s audit:design:*), Bash(git diff:*), Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(ls:*), Bash(2brain query:*)
---

Read `scripts/audit/design-manual/SKILL.md` and follow it. The scope is: $ARGUMENTS

The audit lives under `scripts/audit/` so any AI tool can run it; this file only registers it with
Claude Code. See `docs/tools/ai-auditing.md` and `docs/tools/design-review.md`.
