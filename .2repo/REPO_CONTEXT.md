# Repo Context

_Canonical 2repo context source for AI editors._

## Core Artifacts
- `.2repo/graphify-out/GRAPH_REPORT.md` — structural and semantic code graph report
- `.2repo/EXECUTION.md` — runnable build/test/CI/migration knowledge
- `.2repo/REPO_MEMORY.md` — durable repository memory entries
- `.2repo/repo-index.json` — semantic retrieval index
- `.2repo/wiki/` — living wiki: per-file documentation pages plus `OVERVIEW.md` (generated — do not edit by hand; regenerate with `2repo wiki <repo-path>`)

## Index Metadata
- Provider: `ollama`
- Model: `qwen3.8:27b`
- Index revision: `9fb53f832b97401baba8c767cbd01e80ef7d74643c551ad8c5dcab6d549ad25e`
- Indexed chunks: `4964`
- Memory entries: `0`

## Query
- Semantic query: `2repo query <repo-path> "your question" --top-k 5`
- Add durable memory: `2repo remember <repo-path> "fact/decision/runbook" --kind fact`

