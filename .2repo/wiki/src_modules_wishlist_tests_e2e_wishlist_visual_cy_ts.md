# src/modules/wishlist/tests/e2e/wishlist.visual.cy.ts

## Purpose

Visual regression test for the wishlist screen. It registers the wishlist page in the shared visual-sweep harness so a screenshot can be captured and compared against a co-located baseline. The file itself is just a one-line screen declaration; all sweep logic lives elsewhere.

## Key elements

- **`sweepVisual('wishlist', [['wishlist', '/en/wishlist', '#wishlist-page']], 'user')`** — Registers a single screen (named `wishlist`, navigated to `/en/wishlist`, anchored on `#wishlist-page`) to be captured under the `user` role. The first argument (`wishlist`) scopes the snapshot subfolder; the last argument selects the authenticated fixture used for the visit.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function imported here. All navigation, waiting, screenshotting, and baseline comparison logic is delegated to that helper; this file merely supplies the screen list and role.

## Notes

- Baselines are stored in `__snapshots__/` **beside this file** (i.e. inside the wishlist module). Deleting the module deletes its PNGs automatically; a central folder would leave orphaned screenshots.
- **Not** part of `npm run complete`. Invoke with `npm run test:e2e:visual`.
- Re-record baselines only via `npm run test:e2e:visual:update` **and only after visually inspecting the diff image**. Blind re-recording defeats the purpose of the suite.
