/**
 * @module
 * The design rules' knobs, in one file.
 *
 * Read by `eslint.config.ts` (through `scripts/eslint/design-config.ts`), by the `local/*` design
 * rules, and by the design specs under `tests/`. Pure data: it imports the theme's colour maps
 * and nothing else, so a spec can load it without a browser.
 *
 * Sibling of `module-edges.ts` and `module-groups.ts`, which `eslint.config.ts` imports the same
 * way. What each knob means, and how to change one: `docs/tools/design-lint.md`.
 */
import {
    VARIATION_FAMILIES,
    VUETIFY_DEFAULT_COLORS,
    light,
    variations
} from '../src/ui/vuetify/theme';

/**
 * How loud a finding is. Every design rule lands at `error`: `--max-warnings 0` turns a warning
 * into an error in CI anyway, so a softer level would only hide the finding in the editor.
 */
export type DesignSeverity = 'error' | 'off';

/**
 * The colour names a template may use, derived from the theme rather than listed by hand.
 *
 * Four sources, because Vuetify generates names the theme never declares:
 * - the keys the light theme declares (the type of `dark` forces the same keys);
 * - the colours Vuetify defines in every theme (`surface-bright`, `surface-light`…);
 * - the `-lighten-N` / `-darken-N` variants of the families in `variations`;
 * - an `on-*` text colour for every one of those.
 *
 * `tests/cross-cutting/design-tokens.spec.ts` compares this set with the one Vuetify itself
 * computes, so a Vuetify upgrade that adds or renames a generated colour fails there, not as a
 * false lint finding.
 */
export const themeColorNames = (): ReadonlySet<string> => {
    const base = new Set<string>([
        ...Object.keys(light.colors).filter((name) => !name.startsWith('on-')),
        ...VUETIFY_DEFAULT_COLORS
    ]);
    const steps = (['lighten', 'darken'] as const).flatMap((direction) =>
        Array.from({ length: variations[direction] }, (_, index) => `${direction}-${index + 1}`)
    );
    for (const family of VARIATION_FAMILIES)
        for (const step of steps) base.add(`${family}-${step}`);
    const declaredOn = Object.keys(light.colors).filter((name) => name.startsWith('on-'));
    return new Set([...base, ...[...base].map((name) => `on-${name}`), ...declaredOn]);
};

/** The design policy object. */
export const DESIGN_POLICY = {
    /** Rem to px for the canonicaliser, so `max-w-[1280px]` can map to `max-w-7xl`. */
    rootFontSize: 16,

    /**
     * Strings the colour-literal check lets through. They name no fixed colour: the browser
     * resolves each one against the surrounding style.
     */
    colorKeywords: ['transparent', 'currentcolor', 'inherit'],

    /** Severity per design check. */
    severity: {
        canonicalClasses: 'error',
        conflictingClasses: 'error',
        // Off until the radius scale is realigned to Vuetify's: the plugin's fix for a bare
        // `rounded` is `rounded-sm`, which is the wrong size once `sm` means 2px.
        deprecatedClasses: 'off',
        duplicateClasses: 'error',
        themeToken: 'error',
        unknownClasses: 'error'
    } satisfies Record<string, DesignSeverity>,

    /**
     * Class names that Vuetify, not Tailwind, generates and a template may use by name
     * (regular expressions, matched against the whole class). Tailwind's shadow namespace is
     * wiped, so `elevation-N` is the one way to a shadow that follows the theme.
     */
    vuetifyOwnedClasses: [String.raw`^elevation-\d{1,2}$`],

    /** The theme's stylesheet entry, read live by the Tailwind plugin. */
    tailwindEntryPoint: 'src/styles/main.css',

    /**
     * Vuetify props that take a theme colour. A static value, or any string literal in a bound
     * expression, must be a name from {@link themeColorNames}.
     */
    colorProps: [
        'color',
        'bg-color',
        'base-color',
        'active-color',
        'slider-color',
        'track-color',
        'icon-color'
    ]
} as const;

/**
 * The CSS named colours (CSS Color Module Level 4), lower case. A string that is exactly one of
 * these is a colour literal, however it is spelled, so it belongs in the theme.
 * https://www.w3.org/TR/css-color-4/#named-colors
 */
export const CSS_NAMED_COLORS: ReadonlySet<string> = new Set(
    (
        'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
        'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
        'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
        'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
        'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
        'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
        'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
        'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
        'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
        'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
        'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
        'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
        'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
        'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
        'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
        'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
        'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow ' +
        'yellowgreen'
    ).split(' ')
);

/** Hex colour of 3, 4, 6 or 8 digits, not part of a longer word, path or entity. */
const HEX_COLOR = /(?<![\w&/])#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])/i;

/** A functional colour notation whose arguments are not a `var(` reference. */
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\((?![^)]*var\()/i;

/**
 * Whether a string is, or contains, a colour literal: a hex, a functional notation with no
 * `var(`, or a CSS colour name that is the whole string. A bare name only counts as the whole
 * string, so prose is left alone; `transparent`, `currentcolor` and `inherit` name no fixed colour.
 *
 * @param text - A string from the source or a CSS declaration value.
 */
export const isColorLiteral = (text: string): boolean => {
    if (HEX_COLOR.test(text) || FUNCTIONAL_COLOR.test(text)) return true;
    const word = text.trim().toLowerCase();
    return (
        CSS_NAMED_COLORS.has(word) &&
        !(DESIGN_POLICY.colorKeywords as readonly string[]).includes(word)
    );
};
