---
source: scripts/audit/css-invasive/scan.ts
sha256: 37ed9d3078714d8a57c0bcb2231891813ae894233f2f933e8ad64736fec0b349
signature: 91e413ad232e8ff0ebf611f1b2a349905bd1d2816b478c2f68cfbfc6c707961b
generated_at: 2026-11-10T02:19:51.841359+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/css-invasive/scan.ts

## Purpose

The single automated gate behind `npm run audit:css` and the cross-cutting test spec. It scans three sources — CSS files (via PostCSS + postcss-selector-parser), Vue SFC templates (via `vue/compiler-sfc`), and TS/JS string literals (via the TypeScript compiler) — for patterns that reach into Vuetify internals, redefine Tailwind utilities, or use disallowed CSS units. All findings pass through a unified `css-allow` allowance grammar so the lint and the test share one rule set and one report.

## Key elements

- **`CHECKS`** — The registry of every check (`CheckId` keys). Each entry carries a human-readable `title` and a suggested `fix` in order of resort (prop → defaults → theme → allowance). Includes `vuetify-internal`, `deep`, `vuetify-variable`, `z-index`, `utility-redefinition`, `touch-size-utility`, `vuetify-root-override`, `unit-disallowed-list`, `vuetify-arbitrary-variant`, `native-title`, `vuetify-unknown-class`, `vuetify-dom-query`, `stale-allowance`, `bad-allowance`.
- **`CssFinding`** — The shape of one finding as consumed by the report and ratchet: `file`, `line`, `check`, `anchor` (a stable handle, never a line number), `snippet`, `fix`.
- **`RawHit`** — Internal variant of `CssFinding` that adds a `target` (`file:line[:column]`) used to match allowances.
- **`Allowance`** — Parsed `css-allow` comment: file, line, check id, validity `problem`, and the `target` node it covers.
- **`ALLOWANCE_GRAMMAR`** — Regex (`/^css-allow\s+(\S+)\s+--\s+(\S.*)$/s`) enforcing `css-allow <check> -- <why>`.
- **`parseAllowance`** — Public helper that turns a raw comment string into an `Allowance` or `undefined`; validates the check name against `CHECKS`.
- **`hitOf`** — Internal builder that fills in the default `fix` from `CHECKS` when a specific one isn't supplied.
- **`squash`** — Whitespace-collapsing utility so anchors survive reformatting.
- **`isDeep`, `compoundsOf`, `isBareElement`, `deepReachesElement`, `classesOf`, `usesDeep`** — Selector-parsing helpers that identify `:deep()`/`::v-deep`/`>>>` usage and whether the argument names a bare element.
- **`RuleCheck`** (type) — Signature for per-rule check functions receiving the rule, its parsed selectors, and a `RuleContext` (source + Tailwind utility set).
- **`isAllowedZIndex`, `hasUnit`** — Value-level validators for the `z-index` and `unit-disallowed-list` checks.
- **`KNOBS`** — Read from `DESIGN_POLICY.cssInvasiveness` (e.g. `localZIndexMax`).

## Relationships

- **`scripts/css-sources.ts`** — Provides the file lists (`cssSources`, `vueFiles`), the `ROOT` path constant, the `CssSource` type, and helpers `documentCssSources` / `insideTheme` that the scanner uses to enumerate and classify input files.
- **`scripts/design-policy.ts`** — Supplies the policy configuration object that parameterizes the checks (thresholds, disallowed-unit lists).
- **`scripts/tailwind-build.ts`** — Exports the Tailwind build utility that the scanner calls to obtain the set of generated utility class names, which feeds the `utility-redefinition` check.
- **`scripts/audit/css-invasive/report.ts`** — Consumes the `CssFinding` list and the `CHECKS` registry to render the human-readable audit report.
- **`tests/cross-cutting/css-invasiveness.spec.ts`** — Imports the same scanner functions so the test and the CLI audit gate enforce identical rules.
- **`scripts/lighthouse/evaluate.ts`** — Sits in the same audit pipeline (`npm run audit:*`); does not import from this module directly but shares the broader audit workflow.

## Notes

- The `anchor` field in `CssFinding` is deliberately **not** a line number — it is a stable string (selector, tag + class, or call name) so the ratchet in CI can key on it across reformatting.
- Template checks are intentionally co-located here rather than in ESLint so that the `css-allow` grammar and the report are shared across all three readers (CSS, SFC template, script strings).
- An allowance that matches no finding, or that is missing a check name or a `--` reason, is itself reported as a finding (`stale-allowance` / `bad-allowance`).
- The `:deep()` detection handles all three spellings: `:deep()`, `::v-deep()`, and `:v-deep()`, plus the legacy `>>>` / `/deep/` combinators.
- `hasUnit` is designed to distinguish `dvh` from `vh` — it matches a number followed by exactly that unit, not a substring.
