# Repo Context

_Canonical 2brain context source for AI editors._

## Core Artifacts
- `.2brain/graphify-out/GRAPH_REPORT.md` — structural and semantic code graph report
- `.2brain/EXECUTION.md` — runnable build/test/CI/migration knowledge
- `.2brain/llm-wiki/` — per-file machine-oriented pages, one per source file (page path = source path + `.md`)
- `.2brain/modules/` — human-oriented module notes, mirrored into Obsidian
- `.2brain/arch/` — component/topic pages with Mermaid diagrams
- `.2brain/repo-index.json` — semantic retrieval index backing `2brain query` (a query backend, not a document to open directly)

## Where to look

- **First contact with an unfamiliar codebase** → `.2brain/llm-wiki/OVERVIEW.md` for orientation, then `.2brain/modules/boilerplate-vue-frontend_INDEX.md` for the module map.
- **Editing or reading a source file** → read `.2brain/llm-wiki/<path>.md` first (page path = source path + `.md`). It carries the file's purpose, key elements, graph neighbours, and gotchas not in the source.
- **"How is this structured?" / "where does X live?"** → `.2brain/arch/overview.md`, then the component page it points to.
- **"How do I run / build / test / deploy this?"** → `.2brain/EXECUTION.md`.
- **Anything else, or you don't know which file** → `2brain query <repo-path> "question"`.

Artifacts describe commit `771668817ce4b5dbebe38f9d0cf319fde399ae6a`. Before relying on a wiki page, check its source: `git diff --quiet 771668817ce4b5dbebe38f9d0cf319fde399ae6a -- <file>` (and `git status` for uncommitted edits). Changed → prefer the source for that file and say so. Unchanged → trust the page.

## Most-used code
Change these with care — widely depended on:
- `orvalMutator()` (249 edges)
- `error()` (105 edges)
- `wireModulesIntoCore()` (88 edges)
- `orvalEnvelope()` (61 edges)
- `scripts` (58 edges)
- `parseOrvalFixture()` (57 edges)
- `asStub()` (42 edges)
- `contractRequest()` (30 edges)
- `Chainable` (26 edges)
- `handleSubmit()` (24 edges)

## Cross-cutting flows
- Contract-First Generation Pipeline
- Webhook Event Domains (Order, Payment, Return)
- Deployment Stacks (Dev vs Production)
- Locale CRUD Lifecycle (Create, Read, Update, Delete)
- CI Contract Validation Pipeline (lint, freshness, identity)
- System Health Probe Trio (ping, liveness, readiness)
- E2E Live Infrastructure Stack
- Nightly CI Pipeline (non-gating)
- Release and Image Publishing Pipeline
- Critical Step-Up Permission Keys (re-auth required)
- Permission Key Shape: family.breadth.action with scope and conditions
- E2E Image Validation Test Fixtures

## Index Metadata
- Provider: `ollama`
- Model: `qwen3.8:27b`
- Index revision: `c856d1af0938ae9d1f9b6d26a675a0bdedf659e14b5953d8523d13726a6165d3`
- Indexed chunks: `2390`
- Memory entries: `0`

## Query
- Semantic query: `2brain query <repo-path> "your question" --top-k 5`
- Add durable memory: `2brain remember <repo-path> "fact/decision/runbook" --kind fact`

