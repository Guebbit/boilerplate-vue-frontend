---
name: audit-ddd-drift
description: Report where the strategic-DDD claims (module labels, barrels, who decides a rule) and the code disagree — what the module lint and the specs cannot see
argument-hint: <module|path|--diff>  (default: the whole repo)
allowed-tools: Read, Glob, Grep, Write, Bash(git diff:*), Bash(git status:*), Bash(git branch:*), Bash(ls:*), Bash(rg:*), Bash(2brain query:*)
---

Read `scripts/audit/ddd-drift/SKILL.md` and follow it. The scope is: $ARGUMENTS

The audit lives under `scripts/audit/` so any AI tool can run it; this file only registers it with
Claude Code. See `docs/tools/ai-auditing.md`.
