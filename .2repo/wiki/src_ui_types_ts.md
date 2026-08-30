# src/ui/types.ts

## Purpose

Defines a shared `ThemeAccent` string-literal union so that every UI component that accepts a theme accent references a single named type instead of repeating the inline union. This keeps the set of valid accents editable in exactly one place.

## Key elements

- **`ThemeAccent`** — `type` alias for `'primary' | 'secondary' | 'tertiary'`. The canonical list of accent values a UI organism can be keyed to.

## Relationships

No graph neighbors. This file imports nothing and (per the dependency graph) is not itself a target of any tracked edge.

## Notes

- The consuming components use **two different prop names** for the same concept: `CardInfo` and `Home` call it `variant`; `CardMaterialStat` and `ItemDetailLayout` call it `accent`. The value set is identical (`ThemeAccent`) regardless of the prop name.
- Adding a fourth accent means editing only this one type, not the four component prop declarations.
- This is a pure type file (no runtime code); it is always tree-shaken away at compile time.
