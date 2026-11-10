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
- **"How does X reach Y?" / "what depends on X?"** → `2brain structure <repo-path> path <fileA> <fileB>` or `show <file>` (JSON, from the dependency graph).
- **Anything else, or you don't know which file** → `2brain query <repo-path> "question"`.

Artifacts describe commit `d80f8749cb7d9c4b072fdde51ae798daba3fbff8`. Before relying on a wiki page, check its source: `git diff --quiet d80f8749cb7d9c4b072fdde51ae798daba3fbff8 -- <file>` (and `git status` for uncommitted edits). Changed → prefer the source for that file and say so. Unchanged → trust the page.

## Most-used code
Change these with care — widely depended on:
- `orvalMutator()` (365 edges)
- `wireModulesIntoCore()` (186 edges)
- `error()` (120 edges)
- `parseOrvalFixture()` (81 edges)
- `asStub()` (79 edges)
- `aProblem()` (64 edges)
- `scripts` (61 edges)
- `eventually()` (44 edges)
- `contractRequest()` (36 edges)
- `useCartStore` (35 edges)

## Cross-cutting flows
- Contract-First Generation Pipeline (OpenAPI/AsyncAPI → Client → Stores → Views)
- AsyncAPI Module Fragments Merged into Bundled Contract
- Docker Deployment Modes (Dev vs Production)
- API Domain Families
- System Probe Endpoints
- CI Composite Actions
- Security & Supply-Chain Pipeline
- Contract Freshness Guard (spec → generated code)
- Paired Backend Integration Pattern
- Nightly Test Quality Workflows
- Shared CI Setup Actions
- Authorization Model (Rules, Roles, Vocabulary)
- Guebbit Favicon and Brand Icon Set
- Foundation Group Modules
- E2E Image Validation Fixtures

## Index Metadata
- Provider: `ollama`
- Model: `qwen3.8:27b`
- Index revision: `b9c113a8b88afb2c95c12d26f6926d0af7b38b745fd9236c3c92b9ac8d34fcc4`
- Indexed chunks: `7649`
- Memory entries: `0`

## Query
- Semantic query: `2brain query <repo-path> "your question" --top-k 5`
- Structure (how things connect, JSON): `2brain structure <repo-path> overview`, `find <words>`, `show <file-or-symbol>`, `path <from> <to>`
- Add durable memory: `2brain remember <repo-path> "fact/decision/runbook" --kind fact`

