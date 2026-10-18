---
name: design-manual
description: Judge the rendered design, from screenshots and source, for what no automated check can see
---

ROLE: Product designer reviewing a shipped UI. Not a code reviewer, not an accessibility auditor.
You judge pictures. You cite code.

GOAL: Find design defects in the residual tier: what the lint, layout, touch, visual and Lighthouse
checks, the axe sweeps, `keyboard.cy.ts` and `accessibility-manual` cannot decide mechanically.
Never re-report what they already gate. The model proposes; a deterministic oracle disposes
(`docs/tools/ai-auditing.md`). A design verdict has no oracle, so every finding must name an
anchor, and a script checks every citation.

SCOPE: the argument you were given: a module name (`orders`), `shell`, a path, or `--diff` for the
modules the working tree touches. Empty means the **whole app**.

## Naming the scope

- empty → `full`
- a module or `shell` → that name
- a path → the path slugged, `src/` dropped
- `--diff` → the current branch name slugged (`git branch --show-current`)

Everything below writes to `reports/audit/design-manual/` (gitignored, disposable). Reports are
named `<SCOPE>…`; batch files are named by module, never by number.

## Step 0a — what is already gated, before hunting

Read, in order, and build an **exclusion list** from them. Write it at the top of the report.

1. `docs/tools/accessibility-testing.md`: what axe, the keyboard suite and the lint plugin gate.
2. `docs/tools/design-lint.md`: off-scale spacing, raw colours and the refused classes.
3. `docs/tools/layout-sweep.md`: overflow, clipping, covered controls, 24 px tap targets
   everywhere and 44 px at phone widths, text modes, 200 % text.
4. `docs/tools/touch-testing.md`: a control only a hover reveals, data only a `title` holds, a
   tooltip on a non-control, hover-only meaning.
5. `docs/tools/visual-regression.md`: "did it change" baselines. A difference against a baseline
   is never a design defect by itself.
6. `docs/tools/lighthouse.md`: scores, layout shift, image weight.
7. `scripts/audit/accessibility-manual/SKILL.md`: its residual table (focus order, error-text
   usefulness, motion, timing, reflow at 320 px, live regions, language of parts) is **its**
   findings, not yours.

Do not trust a number or a list in this prompt once it is stale: re-read the page.

## Step 0a (leads) — machine reports are leads, never findings

If they exist, read them for leads:

- `reports/a11y/*.layout.json`: the layout sweep's advisory and allowed findings.
- `reports/touch/*.json`: `title-only-hint` rows (for D13). Also, `text-link` links marked only by
  colour on touch (`hover:underline`) are a D13 / D10 lead.
- `reports/lighthouse/`.

A lead becomes a finding only with its own tile, source line and anchor.

## Step 0b — is the capture fresh?

Read `reports/audit/design-manual/capture/manifest.json`. It is **stale** when it is missing, when
its `scope` does not cover yours, or when `git diff --name-only <gitHead>` touches a file in your
scope or a `chromeSources` file. A manifest with a non-empty `dirty` list says so in the report.

- Module, `shell` or `--diff` scope: run `npm run audit:design:capture -- <scope>` yourself.
- Whole-app scope: **stop** and print `npm run audit:design:capture` for the person to run (about
  45 minutes, a live e2e: it takes the e2e lock and never runs beside Stryker).

## Step 1 — plan the batches

`npm run audit:design:plan -- <scope>` writes `capture/batches.json`. Never batch by hand. An
empty plan is an error to report, not a clean review.

## Step 2 — one reviewer per batch

Give each batch to a sub-agent, in parallel; where your tool has none, do the batches one after
another, each in a fresh pass. A reviewer gets: its batch's shots (tiles and DOM facts from the
manifest), `docs/theory/sitemap.md` (route → view file), the manifest's `chromeSources`, the
exclusion list and leads, and the checklist below.

It must:

1. Read **every tile** of every shot of the batch (all tiles of a page, in order).
2. Find the view in `docs/theory/sitemap.md`, read it, and follow imports into child components.
3. Judge each checklist item, for each screen, in all four verdicts below.
4. Write `reports/audit/design-manual/<SCOPE>.batch-<module>[-n].md` with
   (a) findings rows and (b) a **screen inventory**, one line per shot: page header style, primary
   action (label, variant, position), list shape (table or cards), empty and error pattern,
   status-chip colours, icon-only controls.

## Step 3 — the consistency pass

One reviewer reads **only the inventories** across batches and flags the same meaning rendered
differently (D8). It opens PNGs only for the pairs it flags. This is the one place a
cross-screen judgement fits in a context.

## Step 4 — freeze

Merge into `<SCOPE>.findings.md`. Do not edit it after this point.

## Step 5 — adversarial verify

One verifier sub-agent per batch gets each row's **claim** (item, tile, `file:line`, one-sentence
finding, anchor). It does **not** get the reviewer's reasoning prose. Per row it answers four
questions, yes or no with a one-line reason:

- **Visible?** It opens the tile. Is the defect there, at the described place?
- **Located?** It opens the source. Does the cited line render that element?
- **Not gated?** Is it on the exclusion list, or in a layout, touch or axe report for that route?
- **Anchored?** Does the named anchor hold: the precedent screen really differs, the rule really
  says that, the task really fails?

Any "no" → **REFUTED**, with the reason. An anchored defect with an overstated severity →
**DOWNGRADED**. All "yes" → **CONFIRMED**. Write `<SCOPE>.verified.md`. A wrong row in
`findings.md` is never edited. A run where the verifier refutes nothing is itself suspicious: say so.

## Step 6 — the citation check

`npm run audit:design:check -- <SCOPE>`. A row that fails (tile not in the manifest, `file:line`
missing, unknown item, bad severity, empty fix) is dropped and counted.

## The anchors

Every ISSUE names one of three. Without one it is taste, and taste is dropped, not parked.

1. **Precedent**: the app does it differently elsewhere for the same meaning. Cite the other
   screen's tile and file.
2. **A named rule**: Material 3 guidance (Vuetify implements it), a WCAG criterion axe does not
   test, Apple HIG or Android touch guidance, an NN/g heuristic. Name it.
3. **A task that fails**: "a buyer cannot tell these two orders apart", "the checkout button is
   two screens below the total". Say who fails and at what.

## Severity

| Severity      | Means                                                                 | Typical                                                                                                                                   |
| ------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **S1 blocks** | A user on that device cannot finish the task, or does the wrong thing | A destructive action styled as the primary; an amount or id truncated until it is ambiguous; a control invisible in dark                  |
| **S2 slows**  | The task finishes, with hunting, doubt or an extra step               | A primary action out of thumb reach on a long phone page; the same status in two colours on two screens; an empty table with no next step |
| **S3 polish** | Nobody fails, but the design reads as unfinished                      | Spacing rhythm, a heading one step off, a crop that is merely awkward                                                                     |

## Verdicts

- **ISSUE**: a defect, with its anchor.
- **OK**: checked and fine. Say what was looked at.
- **NOT-APPLICABLE**: say why.
- **NEEDS-DEVICE-CHECK**: a static Chromium screenshot cannot settle it (see Limits). Say which
  device, which route and which question to answer.

## The checklist

A floor, not a ceiling. A reviewer may add an item (`+ name — anchor`) if it names its anchor and
says why no automated check can see it.

| Id  | Item                                  | Look for                                                                                                                                                   | A defect, not taste, when                                                                                                                                                                              | Severity                                     | Gated elsewhere                                                                       |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| D1  | Visual hierarchy, primary action      | One filled `color="primary"` action per view or region. The `h1` is the most prominent text. Destructive actions are not the loudest button                | Two equal-weight filled actions compete. The primary is `text`/`outlined` while a secondary is filled. A delete outranks a save. Cite the `variant`/`color` line                                       | S2. S1 if destructive looks primary          | text contrast (axe)                                                                   |
| D2  | Alignment, grid                       | Header, content and cards share left edges. Labels and fields line up. Cards in a row match height                                                         | A misalignment of 8 px or more across siblings, or one page leaving the container padding its siblings use. Under 4 px: confirm in the class list or drop                                              | S3. S2 if it breaks scanning a table         | off-scale spacing (design-lint); overlap and clipping (layout sweep)                  |
| D3  | Spacing rhythm                        | Related things closer together than unrelated ones (Gestalt proximity). The same structure gets the same gaps                                              | Unrelated groups sit closer than related ones. Or one page spaces a shared structure differently from its siblings                                                                                     | S3                                           | raw px and off-scale tokens (design-lint)                                             |
| D4  | Thumb zone on phone                   | Where the main action sits on a phone: lower half, a sticky bar, or a FAB                                                                                  | On a page taller than 2 phone viewports, the main action is only at the top, or only at the very end with no sticky affordance. Anchor: Hoober's thumb-zone research; Material bottom app bar guidance | S2                                           | tap-target size (layout sweep)                                                        |
| D5  | Content priority on phone             | When columns stack, the task's content comes first. Product: image, title, price, add-to-cart before the long description. Cart: lines, then total and CTA | Task-critical content is pushed below secondary content (a filter panel above results with no collapse). The cart is one column below `lg`                                                             | S2                                           | horizontal overflow (layout sweep); reflow is `accessibility-manual`'s 1.4.10         |
| D6  | Sticky CTA on long forms and checkout | Forms taller than about 2 phone viewports. The checkout total and button                                                                                   | The submit is reachable only at the end, with no progress cue or sticky footer. Or the total and CTA leave the screen together. The cart summary is `lg:sticky` only                                   | S2                                           | —                                                                                     |
| D7  | Truncation that loses meaning         | Ellipses in table cells, chips, cards, the nav; especially the `it` variant                                                                                | The cut removes the part that tells items apart (order ids, variant names, email domains, amounts), with no tooltip, wrap or expand                                                                    | S1 for amounts and identifiers, else S2      | text overflowing its box (layout sweep); data only in a `title` (touch scan)          |
| D8  | Same component, same look, everywhere | Page headers, list toolbars, row actions, status chips, dialogs, back affordances. Judged from the **inventories** (Step 3)                                | One meaning rendered two ways ("paid" green on orders, blue on payments), or the same action in two places. Cite both screens                                                                          | S2                                           | naming consistency (WCAG 3.2.3 and 3.2.4) is `accessibility-manual`'s                 |
| D9  | Empty, loading, error states          | Empty: says why, offers the next step. Loading: a skeleton shaped like the result. Error: what happened, what to do, a retry, still in context             | A blank region, a bare "No data", a raw error string, no way forward, a layout that jumps when data lands. Field-level error text is `accessibility-manual`'s 3.3.3                                    | S2. S1 if an error leaves the user stuck     | layout-shift numbers (Lighthouse); the alert's presence and retry (action-table rows) |
| D10 | Dark-theme parity                     | Everything visible in light exists in dark: borders, dividers, icons, transparent images, logos, shadow-only separation, hard-coded light surfaces         | A separator, icon or control boundary disappears, or a surface stays light. Non-text contrast (WCAG 1.4.11) is not tested by axe, so it is ours                                                        | S2. S1 if a control becomes invisible        | text contrast in dark (axe); hard-coded colours at the source (design-lint)           |
| D11 | Density: desktop vs phone             | Desktop uses its width (tables, two columns, line length up to about 80 ch). Phone isn't crammed                                                           | Desktop body text over about 90 ch per line. A tabular page shown as one narrow column with empty gutters. A phone row with more than 3 data points on one line                                        | S3. S2 when a table is unreadable on phone   | —                                                                                     |
| D12 | Typography scale use                  | One `h1`, the largest. Section titles use the same step on every page. About 3–4 sizes per screen. Cross-check the manifest's `headings`                   | Two competing headline sizes. A section title smaller than body text. The same role at different steps on sibling pages                                                                                | S3                                           | font sizes off the scale (design-lint)                                                |
| D13 | Icon and label clarity                | Icon-only controls are only for universal icons (close, search, menu, cart). The same icon never means two things. Triage the `title-only-hint` rows       | An icon whose meaning a first-time user cannot infer without hovering. Phones do not hover. A link marked only by colour on touch (WCAG 1.4.1)                                                         | S2                                           | accessible names (axe); hidden controls and tooltips on non-controls (touch scan)     |
| D14 | Image crop and aspect                 | `object-fit: cover` crops, grid aspect consistency, how the placeholder reads, blurry upscales                                                             | The crop cuts the subject (the product is unrecognisable). One grid mixes aspects. The placeholder reads as broken content                                                                             | S3. S2 when the product cannot be identified | distortion and oversize bytes (Lighthouse)                                            |
| D15 | Form ergonomics on phone              | From the manifest's `inputs` and the source: `type`, `inputmode`, `autocomplete`. Single column on phone. Labels not placeholder-only                      | Wrong keyboard (quantity without `inputmode="numeric"`, phone not `type="tel"`). A personal-data field without its `autocomplete` token (WCAG 1.3.5: axe checks a token's validity, never its absence) | S2                                           | label association (axe); input font under 16 px (layout sweep)                        |
| D16 | Feedback after actions                | After save, delete, add-to-cart: a visible confirmation near the action, or a message. The button shows progress. A failure reverts visibly                | A mutation with no visible outcome (no message, no navigation, no change on screen). Read the handler: a store call followed by nothing                                                                | S2                                           | toast timing (`accessibility-manual`'s 2.2.1)                                         |

## Limits: what a static screenshot cannot judge

Repeat this list at the top of the report, so a clean report is not read as "the design is fine".

- **Motion**: transitions and animations are frozen on purpose. Timing, easing and vestibular
  safety are not judged.
- **Real devices**: this is desktop Chromium at a phone's width, DPR 1, with touch emulation. It
  does not show iOS Safari's safe-area insets and notch, its dynamic toolbar (the `100vh`
  problems), the soft keyboard covering a focused field, scroll physics, WebKit's "first tap is
  hover" rule, long-press callouts, or a retina display. Those rows are NEEDS-DEVICE-CHECK.
- **Fonts**: Roboto is bundled, so the face is right, but antialiasing and weight rendering on
  iOS and Android are not.
- **Interaction states**: hover, focus and pressed states appear only where a `prepare` step put
  them. Hover does not exist on phones anyway (D13).
- **Inner scroll areas**: only the document and a fullscreen overlay are scrolled and stitched. A
  fixed-height table body or the dictionary's sticky column shows only what fits. A sticky
  element in the document repeats across pieces (`stickyRepeats`); do not report it as a
  duplicated element.
- **Data variety**: the screens show the demo seed. Long names, missing images and hundred-row
  lists appear only where the seed has them.
- **Loading states**: judged only where an action-table row held a request open. The report
  counts the states it did not capture; it never pretends they were judged.
- **The model's eye**: differences under 4 px, exact colours and sub-pixel alignment are not
  reliable from a PNG. Confirm them in the class list or drop them.

## Output

Write `reports/audit/design-manual/<SCOPE>.md`, in this order:

1. The Limits list, then the exclusion list.
2. The counts: shots, tiles, batches; findings proposed, refuted, downgraded, confirmed (per
   severity); states not captured.
3. The findings table:

| id | item | screen (route · viewport · theme · state) | tile | source file:line | severity | verdict | finding | fix |

Then print S1 and S2 rows to the terminal, most severe first.

Rules:

- Do NOT change any file outside `reports/`. This is a report.
- No citation, no finding. No anchor, no finding.
- Never report an alignment or spacing difference under 4 px from a PNG: confirm it in the class
  list or drop it.
- A difference against a visual baseline is never a design defect by itself.
- `reports/` is gitignored and disposable. A real ISSUE belongs in a fix commit or a tracked item,
  not in a report someone keeps.
