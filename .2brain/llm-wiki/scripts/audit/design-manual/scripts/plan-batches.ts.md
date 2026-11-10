---
source: scripts/audit/design-manual/scripts/plan-batches.ts
sha256: 38c2a2ac2c6b5e0f7264dfe489d835b0a47f845e52d095d8282f90c6021bc66f
signature: e5af0066c27e4d5bc12533169b0db0652e7b6f15226630dbe3c27ebe9f1fe89f
generated_at: 2026-11-10T02:23:09.779250+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/plan-batches.ts

## Purpose

Pure planning module that splits a design-capture manifest into batches sized to fit a single reviewer's context window. It groups shots by module and spec case, then greedily packs them into batches under token and tile ceilings so each batch can be handed to one sub-agent reviewer.

## Key elements

- **`BATCH_IMAGE_TOKENS`** (`60_000`) — maximum estimated image-tokens per batch; leaves ~140k of a 200k context for source and reasoning.
- **`BATCH_TILES`** (`20`) — maximum tiles per batch (a reviewer opening 20 images has seen enough).
- **`BatchBudget`** (interface) — the two ceilings (imageTokens, tiles) that bound a batch.
- **`Batch`** (interface) — one reviewer's share: name, module, shot IDs, tile count, estimated tokens.
- **`BatchPlan`** (interface) — the planner's answer: an array of `Batch`es, or an empty array plus a `problem` string.
- **`planBatches(manifest, budget?)`** — exported main function. Groups shots into case-level groups (via internal `groupByCase`), then appends each group to the current open batch for its module; starts a new batch when the next case would exceed either ceiling. A single oversized case always gets its own batch.
- **`groupByCase`** (internal) — collapses shots sharing the same `module` + `spec` + `caseName` into one `CaseGroup`, preserving run order.

## Relationships

- **`scripts/audit/design-manual/scripts/manifest.ts`** — provides the `DesignCaptureManifest` and `DesignShot` types that define the input shape and per-shot tile/token fields consumed by `planBatches`.
- **`scripts/audit/design-manual/scripts/plan.ts`** — the CLI entry point that reads the manifest file, calls `planBatches`, and writes the resulting batches to disk. Kept separate so this module stays pure.
- **`tests/unit/scripts/audit/plan-batches.spec.ts`** — unit tests exercising the packing logic, edge cases (empty manifest, oversized single case, multi-batch naming).
- **`tests/unit/scripts/audit/design-stitch.spec.ts`** — integration-level tests that validate batch output in the context of the full design-stitch pipeline.

## Notes

- **Pure by design:** no `fs`, no `console`, no side effects. All I/O lives in `plan.ts`.
- **Empty manifest is an explicit error:** `planBatches` returns `{ batches: [], problem: '…' }` rather than a silent empty array, so downstream code cannot mistake "nothing captured" for "nothing to plan."
- **Case atomicity:** shots belonging to the same spec case (phone + desktop, all themes) are never split across batches — the reviewer sees the same screen at every size together.
- **Naming convention:** a module with a single batch keeps its bare name (`auth`); multiple batches get a numeric suffix (`auth-1`, `auth-2`, …).
- **Budget is a default, not a constant:** callers can pass a custom `BatchBudget` (e.g. for smaller models or tighter token budgets) without touching the module.
- **`groupByCase` uses a null-byte (`\u0000`) separator** for the composite map key, avoiding collisions from any legal module/spec/case string.
