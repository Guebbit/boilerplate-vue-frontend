---
source: tests/e2e/specs/harness.antibot.cy.ts
sha256: 2a4493576e543ab85958d65ab4b4f774171e680a6f6937ae6b421fc4b204a0d7
signature: 2a4493576e543ab85958d65ab4b4f774171e680a6f6937ae6b421fc4b204a0d7
generated_at: 2026-11-10T06:43:29.263375+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/harness.antibot.cy.ts

## Purpose

Verifies that the antibot shard/matrix run actually boots the human-challenge provider (altcha). Without this check, a mis-wired run would silently pass every `*.antibot.cy.ts` journey by falling into the "provider is off" branch. This spec is the canary that confirms the harness wiring is correct.

## Key elements

- **`describe('The antibot run')`** — Top-level suite; visits `/en` in `beforeEach` to establish a session before making API assertions.
- **`it('boots a backend whose human-challenge provider is altcha, and serves its challenge')`** — Makes two HTTP requests:
  - `GET {apiUrl}/config` → asserts `body.antibot.provider === 'altcha'`.
  - `GET {apiUrl}/antibot/challenge` → asserts HTTP 200.
  - Reads `apiUrl` from `cy.env(['apiUrl'])` (Cypress env variable set by the run harness).

## Relationships

No graph neighbors; this file has no imports or cross-file dependencies (noted by the `requires-module: none` comment).

## Notes

- Excluded from the functional run via `ANTIBOT_SPEC_GLOBS` — it only executes in the dedicated antibot shard.
- Relies on `cy.env('apiUrl')` being injected by the matrix/shard configuration; will fail at runtime (not compile time) if the variable is unset.
- The single assertion pair (config + challenge) is deliberately minimal: it proves the provider is wired and serving, not that individual challenge semantics are correct.
