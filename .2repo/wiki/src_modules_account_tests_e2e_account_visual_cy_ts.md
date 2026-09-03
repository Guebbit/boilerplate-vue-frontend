# src/modules/account/tests/e2e/account.visual.cy.ts

## Purpose

Declares the screen list for the account module's visual-regression sweep. It is a thin configuration file: all sweeping logic lives in `tests/support/e2e/visual-sweep.ts`; this file only names which screens to snapshot.

## Key elements

- **`sweepVisual('account', [['login', '/en/login', '#login-page']])`** — single call registering one screen ("login") at route `/en/login` anchored to `#login-page`. This is the entire executable content of the file.
- **Import:** `sweepVisual` from `tests/support/e2e/visual-sweep` (resolved via `../../../../../`).

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` helper that this file calls. All sweep mechanics (navigation, waiting, capturing, comparing to baselines) are owned by that module; this file contributes only the screen definitions.

## Notes

- Baseline images live in a sibling `__snapshots__/` directory. Deleting the module folder deletes its baselines automatically.
- **Not** included in `npm run complete`. Run explicitly with `npm run test:e2e:visual`.
- Re-record baselines with `npm run test:e2e:visual:update` **only after visually inspecting the diff image**—the convention is a hard gate, not a suggestion.
- The file is a `@module` (no named exports); it produces a side-effect (the registered screen list) when imported by the visual-sweep runner.
