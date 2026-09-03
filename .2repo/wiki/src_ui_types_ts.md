# src/ui/types.ts

## Purpose

A standalone module that holds shared UI-layer type definitions so that multiple components (organisms/molecules) can reference the same type without importing each other. Currently contains a single theme-accent union.

## Key elements

- **`ThemeAccent`** (exported type alias) — Union of three string literals: `'primary' | 'secondary' | 'tertiary'`. Used as a prop type (`variant` or `accent`) by several UI components to constrain which theme accent they render against.

## Relationships

- **Consumers referenced in docstring:** `CardInfo` and `Home` use it as their `variant` prop type; `CardMaterialStat` and `ItemDetailLayout` use it as their `accent` prop type. The file exists specifically so these four (and any future) call sites share one definition instead of re-declaring the three-string union.
- No other graph neighbors.

## Notes

- The file is intentionally isolated: it imports nothing, so it can be pulled into any component without creating cross-component dependencies.
- Adding a fourth accent means editing this one alias rather than updating each consumer's inline literal.
