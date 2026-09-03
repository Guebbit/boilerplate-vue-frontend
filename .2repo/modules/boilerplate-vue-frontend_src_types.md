---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/types/
files: 5
updated: 2026-09-03T11:00:16.935961+00:00
---

# src/types/

## Purpose

`src/types/` is the application's single type-definition layer. It aggregates hand-written domain types, auto-generated schema types, and re-exported third-party package types behind one stable import path (`@/types`), so the rest of the codebase never needs to reach into individual sub-modules or generated packages directly.

## Key parts

- **Barrel (`index.ts`)** — Re-exports every type in this directory so consumers import from `@/types` and nothing else.
- **External / generated types**
  - `api.ts` — One-line re-export of all Orval-generated API types from the `@api` package, shielding consumers from that package's internal location or alias.
  - `asyncapi.generated.ts` — Compile-time interfaces produced from `asyncapi.yaml` by the AsyncAPI codegen tool: observability metric payloads, canonical channel-name constants, and an SSE event-name → payload mapping.
- **Hand-written domain types**
  - `http.ts` — Defines the HTTP response envelope as a discriminated union on `success: boolean`, letting callers narrow to a success or reject shape without branching on status codes.
  - `realtime.ts` — Describes the realtime observability SSE feed: the shape of a rendered event entry and the lifecycle states of the underlying connection. Keeps consumers (rendering components, status indicators) on a lightweight typed contract without importing the full generated AsyncAPI schema.

## How it connects

This module is a leaf in the dependency graph: it imports no other application modules. Its only outbound reference is the `@api` package (surfaced through `api.ts`), which is an external generated artifact rather than a sibling module. Every other part of the codebase that needs a shared type imports from `@/types` and depends on this module, not the reverse.

## Where to start

1. **`index.ts`** — Ten lines that show exactly which types are publicly exposed and where they come from.
2. **`http.ts`** — The smallest hand-written file; its discriminated-union pattern is used throughout the codebase, so understanding it early makes the rest of the type surface click.

## Connected modules
_(none)_

## Files
- `src/types/api.ts` — Single-line barrel that re-exports all generated Orval API types from the `@api` package. It exists so that consumers import types from `@/types` (via the directory barrel) rather than reaching into the generated package directly, keeping the public import surface stable even if the generated package's location or alias changes.
- `src/types/asyncapi.generated.ts` — Auto-generated TypeScript type definitions derived from `asyncapi.yaml` via the AsyncAPI codegen tool. It provides compile-time typed interfaces for observability metrics payloads, canonical channel-name constants, and an SSE event-name → payload mapping so that consumers of the realtime API don't have to hand-write string literals or inline shapes.
- `src/types/http.ts` — Defines the TypeScript interfaces for the API's HTTP response envelope. It establishes a discriminated-union pattern (`success: boolean`) so callers can narrow a generic response into a success or reject shape at compile time, eliminating the need to branch on raw status codes.
- `src/types/index.ts` — Barrel module that aggregates all of this app's type definitions behind a single import path (`@/types`), so consumers never need to import from individual sub-modules.
- `src/types/realtime.ts` — Defines the TypeScript types that describe the realtime observability SSE feed: the shape of an individual rendered event entry and the lifecycle states of the underlying connection. It exists so that consumers of the feed (rendering components, status indicators) share a single, typed contract without importing the full generated AsyncAPI schema.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
