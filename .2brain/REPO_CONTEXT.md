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

Artifacts describe commit `ab5880dd0c5077f37cbcdf73f57e457077ae28b5`. Before relying on a wiki page, check its source: `git diff --quiet ab5880dd0c5077f37cbcdf73f57e457077ae28b5 -- <file>` (and `git status` for uncommitted edits). Changed → prefer the source for that file and say so. Unchanged → trust the page.

## Most-used code
Change these with care — widely depended on:
- `orvalMutator()` (310 edges)
- `wireModulesIntoCore()` (150 edges)
- `error()` (128 edges)
- `orvalEnvelope()` (85 edges)
- `parseOrvalFixture()` (76 edges)
- `asStub()` (62 edges)
- `scripts` (58 edges)
- `contractRequest()` (35 edges)
- `addToCartFromStorefront()` (29 edges)
- `handleSubmit()` (27 edges)

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
- Index revision: `837dfc9b636c7ed170ec1e41179c4a2bcb8514542ca3b8f2eaced3c836ffee3e`
- Indexed chunks: `4940`
- Memory entries: `0`

## Query
- Semantic query: `2brain query <repo-path> "your question" --top-k 5`
- Add durable memory: `2brain remember <repo-path> "fact/decision/runbook" --kind fact`

