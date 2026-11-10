---
source: src/modules/example/tests/e2e/roles.cy.ts
sha256: c8b31da53bbdae73dfd9f0685bf542f90f6203d7501a7f8c56f73c4d53149447
signature: c8b31da53bbdae73dfd9f0685bf542f90f6203d7501a7f8c56f73c4d53149447
generated_at: 2026-11-10T04:24:53.227297+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/e2e/roles.cy.ts

## Purpose

E2E test that verifies the "example" module's pages enforce role-based permissions correctly. It delegates the generic "walk every persona, assert the browser matches that persona's rules" loop to the shared `sweepRoles` helper, and adds one targeted test for a moderator viewing another author's published record.

## Key elements

- **`sweepRoles('example', [...])`** — invokes the shared sweep with a two-case list:
  - `examples list` (`/en/examples`) — expects `read` + `Example` on the page, plus `create` + `Example` on the `#example-create` button.
  - `example create` (`/en/examples/create`) — expects `create` + `Example` at the page level.
- **`ADMIN_PUBLISHED`** — hard-coded Mongo ID (`65e1a0000000000000000e04`) of a seeded example owned by the admin persona.
- **`describe('example, another author's record', …)`** — single test that logs in as `moderator`, visits the admin's published example, asserts the page renders (`#example-target` exists) but the edit, delete, and status-action controls are absent.

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — provides the `sweepRoles` function called at the top of this file. This file supplies the module name and the array of page/button permission cases; the helper handles iteration over personas, navigation, and assertions.

## Notes

- Co-located under `src/modules/example/` deliberately: deleting the example module also removes its role sweep.
- The sweep case list is the *only* module-specific content here; all persona iteration logic lives in the helper.
- `beforeEach` calls `cy.restore()` to reset seeded fixtures before each case.
- The moderator test depends on the specific seeded ID in `ADMIN_PUBLISHED`; if the fixture seed changes, this constant must be updated in lockstep.
