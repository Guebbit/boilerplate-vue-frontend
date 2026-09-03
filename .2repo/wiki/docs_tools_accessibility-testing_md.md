# docs/tools/accessibility-testing.md

## Purpose

Documents the automated accessibility testing suite (axe-core via Cypress, a keyboard-interaction suite, and a template lint plugin). It defines the sweep model, the failure threshold, the reporting format, the pinned rule set, and the rationale for per-module sweeps over a central route list.

## Key elements

- **`sweepA11y(name, entries)`** — the per-module sweep function. Each entry is either a `[name, path]` pair or an object with optional `viewport`, `theme`, and `prepare()` that runs after content-wait and before axe.
- **`cy.checkPageA11y()`** — runs one axe pass with a pinned `runOnly` tag list (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`). Fails the spec on `serious`/`critical` findings; logs `minor`/`moderate` to the JSON report.
- **`reports/a11y/<spec-safe-name>.json`** — per-spec JSON artifact (one entry per audited state: rule id, impact, help URL, tags, node selectors). Written via `cy.task`; uploaded as the `a11y-reports` CI artifact on every run. Gitignored.
- **Content wait** — every case runs `cy.get('h1')` (or equivalent) before axe, so the audit never sees a loading skeleton.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** — assertion that upgrades the old "central route list" into a coverage check, replacing it after the per-module sweep migration.
- **Keyboard-interaction suite** — a smaller second suite that presses real keys (referenced in the overview but detailed elsewhere).
- **Template lint plugin** — reads every Vue template for a11y issues before any e2e run executes.

## Relationships

- **`docs/tools/visual-regression.md`** — A bug in the shared `cy.visit()` override (auditing the previous route instead of the target) was surfaced by this suite and is documented under the "bug this suite found" section of that page. Fixing it was a prerequisite for most a11y cases to audit the correct page.

## Notes

- The failure gate is **serious/critical only**. Minor and moderate findings are logged to the JSON report but never block. Rationale: advisory findings produce disputed failures; a gate nobody agrees with gets disabled, and then serious findings escape too.
- The axe rule set is **pinned by tag**, not left at axe's default, so an `npm update` of axe-core cannot silently add a rule and break a passing page.
- Retried tests **overwrite** their JSON entry rather than append; CI shards run disjoint spec sets so no two processes write the same file.
- The suite audits the **whole document with no exclusions and no suppressed rules**. This works because `vite preview` (used in all e2e scripts) does not serve `vite-plugin-vue-devtools` (it is `apply: 'serve'` only). If an exclusion ever becomes necessary, exclude the element, never the rule globally.
- The per-module sweep structure (vs. one central list) was chosen because a deleted module would otherwise leave orphan route entries that fail the suite.
- Five real defects were found and fixed; all were boilerplate-level (missing `aria-label` on progressbars, Vuetify label contrast, a `text-primary` misuse as a link colour, and a loading-state opacity issue that also made the test timing-dependent).
