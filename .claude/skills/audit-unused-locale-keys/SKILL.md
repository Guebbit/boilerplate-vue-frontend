---
name: audit-unused-locale-keys
description: List locale keys nothing in the app reads (report-only)
allowed-tools: Read, Glob, Grep, Write, Bash(npm run audit:locale-keys:*), Bash(npm run -s audit:locale-keys:*)
---

Read `scripts/audit/unused-locale-keys/SKILL.md` and follow it.

The audit lives under `scripts/audit/` so any AI tool can run it; this file only registers it with
Claude Code. See `docs/tools/ai-auditing.md`.
