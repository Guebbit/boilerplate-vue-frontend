---
name: css-invasive
description: Judge the CSS no rule can judge — invasive, exaggerated or over-complicated styling against Vuetify and Tailwind
---

ROLE: Front-end reviewer of stylesheets. Not a designer, not an accessibility auditor. You read
CSS, templates and Vuetify's source. You do not judge how a screen looks.

GOAL: Find CSS that answers a question Vuetify or Tailwind already answer, in the residual tier:
what `npm run audit:css` and the design lint cannot decide mechanically. Never re-report a hit
the scanner already lists. The model proposes; a deterministic oracle disposes
(`docs/tools/ai-auditing.md`). Here the oracle is the source: every finding cites a `file:line`
and one anchor.

SCOPE: the argument you were given: a module name (`locales`), a path, or `--diff` for the files
the working tree touches. Empty means the **whole app**.

## Naming the scope

- empty → `full`
- a module → the module name
- a path → the path slugged, `src/` dropped
- `--diff` → the current branch name slugged (`git branch --show-current`)

Everything below writes to `reports/audit/css-invasive/` (gitignored, disposable).

## Step 0 — what is already gated, before hunting

Read, in order, and build an **exclusion list** from them. Write it at the top of the report.

1. `scripts/audit/css-invasive/scan.ts` (`CHECKS`): every automated check, by id. A hit of one
   of those is the scanner's, not yours.
2. `docs/tools/design-lint.md`: the class lint (arbitrary values, `vh`, `white`/`black`, z-index
   classes, hover-only), `local/theme-token`, and the stylesheet specs.
3. `tests/cross-cutting/design-tokens.spec.ts`: colour literals, theme names, breakpoints in CSS.
4. `docs/tools/layout-sweep.md`: a fixed size that really overflows is the sweep's finding.
5. `docs/tools/touch-testing.md`: a `title`-only hint on a rendered page is the touch scan's.

Do not trust a number or a list in this prompt once it is stale: re-read the page.

## Step 0 (leads) — machine output is a lead, never a finding

Run `npm run audit:css -- --json` and read it. Every hit is a lead for C1 (is there a better
route than the one its `fix` names?), never a finding by itself. A lead becomes a finding only
with its own anchor and a judgement the scanner could not make.

## Step 1 — list the surface

For the scope, list:

- every SFC `<style>` block (file, lines, declaration count);
- every rule of `src/styles/main.css` outside `@theme`;
- every `css-allow` comment (CSS, template `<!-- -->`, script `//`);
- every Vuetify prop given a raw number (`max-width`, `width`, `height`, `size`) in a template.

## Step 2 — judge each item

A floor, not a ceiling. Add an item (`+ name — anchor`) if it names its anchor.

| Item | Question                                                                                                                                                                                                                                                                                                     | Anchor                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| C1   | **Is every allowance still earned?** Is there now a prop, a `createVuetify({ defaults })` entry, a theme `variables` key or a public `--v-<component>-*` hook? Read the Vuetify version in `node_modules/vuetify/package.json` and the component's props (`node_modules/vuetify/dist/json/attributes.json`). | Vuetify docs and component source                                                |
| C2   | **Could a scoped block be Tailwind classes or component props** with no pixel change?                                                                                                                                                                                                                        | https://tailwindcss.com/docs/compatibility                                       |
| C3   | **Is a Vuetify prop given a repeated magic number** (dialog `max-width`, media `:width`/`:height`)? Should it be a named size, or a `defaults` entry?                                                                                                                                                        | CLAUDE.md "a value used twice is a token"                                        |
| C4   | **Does each unlayered rule say why it must be unlayered?** Could it sit in a layer after `vuetify-components` instead?                                                                                                                                                                                       | https://developer.mozilla.org/en-US/docs/Web/CSS/@layer; Vuetify 4 upgrade guide |
| C5   | **Is the stacking order coherent?** The `--z-index-*` tokens against Vuetify's overlay base (2000) and each other; no "+1 to win" value.                                                                                                                                                                     | `docs/theory/design-system.md` (z-index)                                         |
| C6   | **Is any declaration dead?** It sets what is already set, or overrides a property the target never sets.                                                                                                                                                                                                     | Vuetify CSS source (`node_modules/vuetify/lib/components/**.css`)                |
| C7   | **Does a utility fight a Vuetify component where the scanner cannot see it?** `:class` bindings, class maps in scripts, utilities on a component with no matching prop (a `min-h-11` on `v-chip`: the precedent is `useTouchFriendlySize`).                                                                  | precedent / named rule                                                           |
| C8   | **Does `:deep` reach into a child we own** (fix the child: a prop or a slot class) or into Vuetify (a prop, a slot or `defaults`)?                                                                                                                                                                           | https://vuejs.org/api/sfc-css-features.html                                      |
| C9   | **Does a tooltip (`v-tooltip`) hold information nothing visible repeats?** The scanner sees native `title` only.                                                                                                                                                                                             | CLAUDE.md § UI and design; `docs/tools/touch-testing.md`                         |

## Step 3 — freeze

Write `reports/audit/css-invasive/<SCOPE>.findings.md`, one row per finding:

| item | file:line | finding (one sentence) | anchor | severity | fix |

Do not edit it after this point.

## Step 4 — adversarial verify

One verifier (a sub-agent where your tool has one, else a fresh pass) gets each row's claim, not
the reasoning. Per row, yes or no with a one-line reason:

- **Located?** Does the cited line hold that CSS or that element?
- **Not gated?** Is it on the exclusion list, or a scanner hit?
- **Anchored?** Does the named prop, doc or precedent really say that?
- **Pixel-neutral fix?** Does the proposed fix keep the rendering, or does the row say what moves?

Any "no" → **REFUTED**. An anchored row with an overstated severity → **DOWNGRADED**. All "yes"
→ **CONFIRMED**. Write `<SCOPE>.verified.md`. A run where the verifier refutes nothing is itself
suspicious: say so.

## Severity

| Severity | Means                                                            | Typical                                                                                                |
| -------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **S1**   | Breaks a theme, a breakpoint or a Vuetify upgrade                | A rule on a Vuetify class that a minor release renames; a dark-theme surface a hard value leaves light |
| **S2**   | A second answer to a question Vuetify or Tailwind already answer | A scoped block that a prop replaces; a token raised in two files                                       |
| **S3**   | Tidy                                                             | A dead declaration; an unlayered rule with no reason written                                           |

## Verdicts

- **ISSUE**: a defect, with its anchor.
- **OK**: checked and fine. Say what was looked at.
- **NOT-APPLICABLE**: say why.

## Output

Print the `ISSUE` rows to the terminal, most severe first.

Rules:

- Do NOT change any file outside `reports/`. This is a report.
- A finding needs a citation and an anchor. No anchor, no finding: taste is dropped.
- A real `ISSUE` belongs in a fix, a new scanner check, or a tracked issue.
