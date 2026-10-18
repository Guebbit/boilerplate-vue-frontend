/**
 * @module
 * Shared UI-layer types used across organisms/molecules, kept separate from any one component so
 * neither side of the union has to import the other.
 */

import type { light, VARIATION_FAMILIES, VUETIFY_DEFAULT_COLORS } from '@/ui/vuetify/theme';

/**
 * The lighten / darken steps `variations` generates for each family.
 * `tests/cross-cutting/design-tokens.spec.ts` compares the names this type builds against the
 * ones Vuetify generates, so a step added to `variations` without it fails there.
 */
type VariationLevel = 1 | 2;

/**
 * A colour the theme declares or Vuetify defines, without its generated variants:
 * every declared key that is not an `on-*` pair, plus Vuetify's always-present defaults.
 */
type BaseThemeColor =
    | Exclude<keyof (typeof light)['colors'], `on-${string}`>
    | (typeof VUETIFY_DEFAULT_COLORS)[number];

/**
 * A generated variant: `primary-darken-1`, `tertiary-lighten-2`.
 */
type VariationColor =
    `${(typeof VARIATION_FAMILIES)[number]}-${'lighten' | 'darken'}-${VariationLevel}`;

/**
 * Every colour name a template may hand to a Vuetify `color` prop or a `--v-theme-*` variable:
 * the base colours, their variants, and the `on-*` text colour Vuetify generates for each.
 *
 * Why a type and not a lint rule alone: a status map in a script (`{ draft: 'warning' }`) reaches
 * a template through a variable, which no template rule can follow. Typing the map as
 * `Record<Status, ThemeColor>` makes `vue-tsc` refuse a typo or a Vuetify palette name.
 */
export type ThemeColor = BaseThemeColor | VariationColor | `on-${BaseThemeColor | VariationColor}`;

/**
 * The three theme accents a UI organism can be keyed to.
 *
 * One type rather than the union written out at each declaration: `CardInfo` and `Home` call the
 * prop `variant`, `CardMaterialStat` and `ItemDetailLayout` call it `accent`, and four hand-written
 * copies of the same three strings is four places to edit for a fourth accent.
 */
export type ThemeAccent = Extract<ThemeColor, 'primary' | 'secondary' | 'tertiary'>;
