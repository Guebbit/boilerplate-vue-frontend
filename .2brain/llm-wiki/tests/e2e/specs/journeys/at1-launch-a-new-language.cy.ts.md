---
source: tests/e2e/specs/journeys/at1-launch-a-new-language.cy.ts
sha256: a8697d6d093f7bb116c231ab17e753f62c98085a48b1192af336ce10da575a11
generated_at: 2026-10-17T02:07:10.372553+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at1-launch-a-new-language.cy.ts

## Purpose

End-to-end journey test that walks the full lifecycle of launching a new language (German, tag `de`) as an **editor** role: register it inactive, populate its frontend dictionary three ways (manual entry, JSON merge-import, inline edit), trim a key, export and verify the file, activate the language, confirm a guest sees it in the switcher and reads German text on the storefront, then assert the fallback `en` refuses deletion while the new language deletes cleanly. It exists to lock down the editor's `locales.any.*` permission story end-to-end.

## Key elements

- **`TAG`** – the language tag under test (`'de'`); not a seed language, no app-shipped file.
- **`IMPORTED`** – the two-key JSON payload used for the merge-import step.
- **`BY_HAND`** – the single key/value pair entered through the entry-creation dialog.
- **`EDITED_RESET`** – the value written by the inline-edit (blur-save) step.
- **`LocaleRow` / `LocalesAnswer`** – minimal interfaces describing the `GET /locales` response slice the test reads.
- **`offeredToGuests()`** – calls the public `/locales` endpoint via `cy.task('guestApi')` with no session; returns `'absent'`, `'listed-off'`, or `'offered'` for `TAG`.
- **`openEntriesOfNewLanguage()`** – navigates to `/en/locales`, clicks the row-entries link for `TAG`, and narrows the filter to the Frontend dictionary.
- **`downloadedExport()`** – reads and parses `${downloadsFolder}/${TAG}.json` produced by the export button.
- **`describe` → single `it`** – the entire journey as one linear test with `cy.step()` markers; `beforeEach` restores a clean seed and revisits `/en`.

## Relationships

No graph neighbors are recorded for this file. It is a leaf e2e spec that exercises the application exclusively through the browser and a single `cy.task('guestApi')` bridge; it imports no project source modules.

## Notes

- The test asserts guest visibility via the **public API** (`guestApi` task), not the editor's own language switcher, because an editor can *read* inactive languages even when they are not *offered* to guests.
- `TAG` (`de`) is deliberately chosen so the app ships no locale file for it; all dictionary content is created within the test and cleaned up by the final delete step.
- Several `cy.get(...).click({ force: true })` calls are forced because a success toast from a prior save overlaps the target button; this is a UI-timing workaround, not a skip.
- The export verification (`deep.equal`) expects the hand-added key to be **absent** (it was deleted earlier) and the inline-edited value to **replace** the imported one.
- The test logs out before the storefront check (`cy.logout()`) to simulate a true guest, then logs back in as editor for the deletion assertions.
