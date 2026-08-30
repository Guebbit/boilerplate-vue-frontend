# CLAUDE.md

## Purpose
Mandatory coding-standards and style guide for the project, written as AI-assistant instructions (the name "CLAUDE" signals it is consumed by Claude/LLM agents). It codifies non-negotiable rules for TypeScript, function design, async handling, commenting, and file layout so that generated and human-written code follow a single convention set.

## Key elements
- **TypeScript rules** — `strict: true`, no `any` (use `unknown` + narrowing), ESM-only imports.
- **Function design rules** — SOLID, single responsibility, nesting ≤ 3 levels, prefer pure functions.
- **Async / error-handling conventions** — prefer `.then`/`.catch`/`.finally` chains for 1–2 awaits; `async`/`await` only for multi-step sequences; avoid `try`/`catch` unless rollback is needed; no swallowed promises.
- **Comment / JSDoc requirements** — JSDoc mandatory on every exported function, interface, and file (`@module` header); inline notes for non-trivial helpers; Mermaid diagrams required for flow/architecture docs.
- **Code layout rules** — every top-level declaration (constants, types, helpers, refs, computeds, actions) carries its own JSDoc block; exactly two blank lines separate top-level declarations.
- **External-call commenting** — non-obvious parameters (magic numbers, bare booleans, option objects) on third-party calls must be annotated inline or via JSDoc.
- **2repo integration block** — `<!-- 2repo:start … 2repo:end -->` section instructing the agent to read `.2repo/REPO_CONTEXT.md` and related files (`.2repo/GRAPH_REPORT.md`, `.2repo/EXECUTION.md`, `.2repo/REPO_MEMORY.md`, `.2repo/repo-index.json`) before proposing changes; includes a `2repo query` command for cross-file retrieval.

## Relationships
- **`.2repo/REPO_CONTEXT.md`** (and sibling `.2repo/*` files) — directly referenced via the `@.2repo/REPO_CONTEXT.md` import and the regenerate comment; the file tells the agent to consult these before editing code.
- **`README.md`**, **`CHANGELOG.md`**, **`asyncapi.yaml`**, **`openapi.yaml`** — listed as graph neighbors; no direct textual reference appears in `CLAUDE.md`. They sit in the same documentation/spec cluster, and the standards here govern how implementation code for those APIs is written, but the file itself does not link to them.

## Notes
- Directives are phrased as MUST / MUST NOT — they are enforced rules, not suggestions.
- "ADHD friendly" is an explicit style goal: short lines, one idea per line, "why" before "how", no paragraphs, no restating code.
- Comments are explicitly **not** a substitute for `docs/`; they point at docs, they don't reproduce them.
- The two-blank-line rule between top-level declarations is a hard formatting rule, not a preference.
- The 2repo block is auto-generated; edit the `2repo` config, not the block itself (regenerate via `2repo <repo-path>`).
