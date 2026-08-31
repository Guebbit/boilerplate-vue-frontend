/**
 * @module
 * Shared UI-layer types used across organisms/molecules, kept separate from any one component so
 * neither side of the union has to import the other.
 */

/**
 * The three theme accents a UI organism can be keyed to.
 *
 * One type rather than the union written out at each declaration: `CardInfo` and `Home` call the
 * prop `variant`, `CardMaterialStat` and `ItemDetailLayout` call it `accent`, and four hand-written
 * copies of the same three strings is four places to edit for a fourth accent.
 */
export type ThemeAccent = 'primary' | 'secondary' | 'tertiary';
