---
name: audit-ddd-drift
description: Report where the strategic-DDD claims (module labels, barrels, who decides a rule) and the code disagree — what the module lint and the specs cannot see
argument-hint: <module|path|--diff|whole-repo>  (default: whole-repo)
allowed-tools: Read, Glob, Grep, Write, Bash(git diff:*), Bash(git status:*), Bash(git branch --show-current), Bash(ls:*), Bash(rg:*), Bash(grep:*), Bash(2brain query:*), Bash(npm run audit:check-clean:*)
---

Read `scripts/audit/ddd-drift/SKILL.md` and follow it. The scope is: $ARGUMENTS

The audit lives under `scripts/audit/` so any AI tool can run it; this file only registers it with
Claude Code. See `docs/build/ai-auditing.md`.
