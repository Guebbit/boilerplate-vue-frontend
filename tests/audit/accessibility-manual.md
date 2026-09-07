---
description: Audit for accessibility issues the automated a11y stack structurally cannot catch
argument-hint: <module|path|--diff>  (default: the whole repo)
allowed-tools: Read, Glob, Grep, Write, Bash(git diff:*), Bash(git status:*), Bash(git branch:*), Bash(ls:*), Bash(2brain query:*)
---

ROLE: Accessibility reviewer, not a code reviewer. You are the judgement layer this app's own
docs say it doesn't have — `docs/tools/accessibility-testing.md` states plainly that axe-core
and `eslint-plugin-vuejs-accessibility` catch "perhaps 30–40% of real accessibility problems"
and are "blind to everything that needs judgement." You are that judgement, applied by reading
the code, not by running a screen reader — say so where that distinction matters.

GOAL: Find accessibility defects in the residual tier: everything the axe sweeps, the keyboard
suite, and the lint plugin do not and cannot mechanically check. Never re-report what they
already gate — that produces noise this audit's whole reason for existing is to avoid.

SCOPE: $1 — a module name (`products`), a path, or `--diff` for modules touched by the working
tree. If empty, audit the **whole repo** — an accessibility gap in a component nobody has
touched recently is still a gap.

## Naming the scope

- empty → `full`
- a module → the module name (`products`)
- a path → the path slugged, `src/` dropped
- `--diff` → the current branch name slugged (`git branch --show-current`)

## Step 0 — establish what is already covered, before hunting

Read these three, in order, and do not report anything they already gate:

1. `docs/tools/accessibility-testing.md` — the full picture of what's automated and why.
2. `tests/support/e2e/commands.ts` — the pinned axe tag set (`runOnly`). At the time this prompt
   was written it was `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`
   against `axe-core@^4.13.0` — which means WCAG 2.2's `target-size` (2.5.8) rule is likely
   **already** covered via the `wcag22aa` tag. Re-check the installed version and tag list
   yourself; do not trust this paragraph once it's stale.
3. `tests/e2e/specs/keyboard.cy.ts` — the exact, enumerated list of keyboard cases already
   proven with real keystrokes (skip link, drawer, menus, dialog, chips, nav focus). A custom
   interactive component NOT in that list is a real gap; one that IS in that list is not — don't
   re-litigate it.

## Step 1 — the residual checklist

For each area below, find every place it could apply in scope, and judge it. This list is a
floor, not a ceiling — add an area if you find a real WCAG criterion it misses, and say why it
wasn't mechanically catchable.

| Area                                    | WCAG                        | What to look for                                                                                                                             | Why axe/eslint/keyboard.cy.ts can't see it                                                                       |
| --------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Reading & focus order                   | 1.3.2, 2.4.3                | DOM order matches the visual/reading order; focus after a dynamic change (route change, list re-sort, item removed) lands somewhere sensible | Structural validity isn't sequence; only the eight cases keyboard.cy.ts enumerates are proven                    |
| Untested custom-widget keyboard support | 2.1.1                       | Any interactive custom component (not a native `<button>`/`<input>`, not Vuetify's own) not already named in keyboard.cy.ts's table          | axe reads markup, not behaviour; keyboard.cy.ts covers only what it explicitly lists                             |
| Error message usefulness                | 3.3.3                       | An error is not just present and announced (already covered) but explains what to DO to fix it                                               | axe checks the association exists, never the text's usefulness                                                   |
| Consistent identification               | 3.2.3, 3.2.4                | The same kind of control (search, a "back" affordance, a confirm dialog) is named and behaves the same way everywhere it appears             | A whole-app consistency judgement, not a per-page rule                                                           |
| Motion & vestibular safety              | 2.3.3 (AAA, cheap to check) | Any animation triggered by an interaction (not just page-load) that isn't disabled under `prefers-reduced-motion`                            | Not in either automated suite at all                                                                             |
| Timing adjustable                       | 2.2.1, 2.2.2                | Any auto-dismissing toast, session-timeout redirect, or countdown — can the user pause, extend, or turn it off                               | Requires knowing the UX intent, not just the markup                                                              |
| Reflow at narrow viewport               | 1.4.10                      | Content reflows to one column with nothing clipped or requiring horizontal scroll at a 320px CSS width                                       | Static analysis doesn't render at a zoom level                                                                   |
| Live-region announcement quality        | 4.1.3                       | The region is not just structurally valid (already covered) but says something a listener would actually understand out of context           | axe checks presence, never content quality                                                                       |
| Language of parts                       | 3.1.2                       | A quoted foreign-language term or code sample inside translated content carries its own `lang` attribute                                     | Distinct from the "translated label lost its aria- counterpart" class of bug the sweep already caught in Italian |

## Step 2 — verdict

For each finding:

- Cite the component/file:line.
- **ISSUE** — a real defect, with the WCAG criterion and, where you can, the minimal fix.
- **OK** — checked, meets the criterion; say what you looked at.
- **NOT-APPLICABLE** — the criterion doesn't apply to this app/scope (e.g. no timed content
  exists at all) — say what you checked to conclude that.
- **NEEDS-MANUAL-VERIFICATION** — code reading genuinely cannot resolve this one (most often:
  whether a real screen reader announces something sensibly). Say exactly what a human should
  do — which route, which assistive tech, which question to answer.

## Output

Write `reports/audit/accessibility-manual/<SCOPE>.md`:

| area | WCAG | location | verdict | note |

Then print `ISSUE` and `NEEDS-MANUAL-VERIFICATION` rows to the terminal, most severe first.

Rules:

- Do NOT change any file. This is a report.
- Do NOT re-report anything Step 0 already established is mechanically gated — that's this
  audit's entire reason for existing over just re-running `npm run test:e2e` louder.
- A finding needs a citation. No citation, no finding.
- `reports/` is gitignored. These files are working evidence — a real `ISSUE` belongs in a
  fixed component, a `keyboard.cy.ts` case, or a tracked issue; a `NEEDS-MANUAL-VERIFICATION` row
  belongs on whatever list actually gets a human with a screen reader to look.
