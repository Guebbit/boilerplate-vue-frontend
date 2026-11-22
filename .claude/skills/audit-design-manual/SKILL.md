---
name: audit-design-manual
description: Judge the rendered design, from screenshots and source, for what no automated check can see
argument-hint: <module|path|shell|--diff|whole-repo>  (default: whole-repo)
allowed-tools: Read, Glob, Grep, Write, Agent, Bash(npm run audit:design:*), Bash(npm run -s audit:design:*), Bash(git diff:*), Bash(git status:*), Bash(git branch --show-current), Bash(git rev-parse:*), Bash(ls:*), Bash(2brain query:*), Bash(npm run audit:check-clean:*)
---

Read `scripts/audit/design-manual/SKILL.md` and follow it. The scope is: $ARGUMENTS

The audit lives under `scripts/audit/` so any AI tool can run it; this file only registers it with
Claude Code. See `docs/build/ai-auditing.md` and `docs/build/design-review.md`.
