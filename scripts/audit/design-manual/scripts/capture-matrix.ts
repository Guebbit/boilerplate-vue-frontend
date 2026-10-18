/**
 * @module
 * Which shots a sweep case becomes in capture mode: the matrix, as a pure function.
 *
 * Why:  a full cross-product (every case at every size in both themes) would shoot twice what a
 *       reviewer can read; each rule below says what a size or a theme is there to show.
 * Pure: no Cypress, no disk. The sweep calls it once per case at collection time.
 */
import type { ViewportName } from '../../../e2e/viewports';

/**
 * The slice of a sweep case the matrix needs.
 */
export interface CaptureCaseShape {
    /** The case's human name. */
    name: string;
    /** Whether the case has a `prepare` step: a menu, a dialog, a submitted-empty form. */
    hasPrepare: boolean;
    /** The size the case is pinned to, if any. */
    viewport?: ViewportName;
    /** The theme the case is pinned to, if any. */
    theme?: 'dark';
}

/**
 * One planned shot of a case.
 */
export interface PlannedShot {
    /** Stable slug: `<module>--<case>--<viewport>--<theme>[--<locale>]`. */
    id: string;
    /** The size to lay the app out at. */
    viewport: ViewportName;
    /** The theme to assert before the shot. */
    theme: 'light' | 'dark';
    /** The locale prefix to visit under. */
    locale: string;
}

/**
 * The locale a route is written in; every other locale rewrites its prefix.
 */
export const DEFAULT_LOCALE = 'en';

/**
 * The sizes a plain case is shot at, with the theme at each.
 *
 * Phone is where design breaks, so it gets dark parity too; tablet and desktop only check that
 * the layout adapts.
 */
const PLAIN_SHOTS: readonly Pick<PlannedShot, 'viewport' | 'theme'>[] = [
    { viewport: 'phone', theme: 'light' },
    { viewport: 'phone', theme: 'dark' },
    { viewport: 'tablet', theme: 'light' },
    { viewport: 'desktop', theme: 'light' }
];

/**
 * The sizes a prepared case with no pinned size is shot at: a dialog is fullscreen on a phone
 * and floats on a desktop, so the two look different.
 */
const PREPARED_SIZES: readonly ViewportName[] = ['phone', 'desktop'];

/**
 * A readable slug: lowercase words joined by single dashes.
 *
 * @param text - any label
 */
export const slugOf = (text: string): string =>
    text
        .toLowerCase()
        .replaceAll(/[^\da-z]+/g, '-')
        .replaceAll(/^-|-$/g, '');

/**
 * The module a sweep spec belongs to: the folder under `src/modules`, or `shell` for the
 * app-level sweep in `tests/e2e/specs`.
 *
 * @param specRelative - the spec's repo-relative path
 */
export const moduleOfSpec = (specRelative: string): string =>
    /^src\/modules\/([^/]+)\//.exec(specRelative)?.[1] ?? 'shell';

/**
 * Rewrites a route's locale prefix (`/en/orders` to `/it/orders`).
 *
 * @param route - a path that starts with the default locale
 * @param locale - the locale to visit under
 */
export const withLocale = (route: string, locale: string): string =>
    locale === DEFAULT_LOCALE
        ? route
        : route.replace(new RegExp(`^/${DEFAULT_LOCALE}(?=/|$)`), `/${locale}`);

/**
 * The shots one case becomes.
 *
 * | Case                              | Shots                                              |
 * | --------------------------------- | -------------------------------------------------- |
 * | plain                             | phone·light, phone·dark, tablet·light, desktop·light |
 * | size and/or theme, no `prepare`   | none: it is a layout variant of a plain case       |
 * | `prepare`, pinned size            | that size, light (and dark when pinned to dark)    |
 * | `prepare`, no size                | phone·light, desktop·light (dark too when pinned)  |
 *
 * Every locale besides the default adds phone·light of a plain case under that prefix: longer
 * strings are where truncation shows up.
 *
 * @param shape - the case
 * @param module - the module slug that starts every id
 * @param locales - the locales to cover; the default one is always covered
 */
export const expandCase = (
    shape: CaptureCaseShape,
    module: string,
    locales: readonly string[] = [DEFAULT_LOCALE]
): PlannedShot[] => {
    const base = `${module}--${slugOf(shape.name)}`;
    const planned = (
        viewport: ViewportName,
        theme: 'light' | 'dark',
        locale = DEFAULT_LOCALE
    ): PlannedShot => ({
        id: `${base}--${viewport}--${theme}${locale === DEFAULT_LOCALE ? '' : `--${locale}`}`,
        viewport,
        theme,
        locale
    });

    if (shape.hasPrepare) {
        const sizes = shape.viewport ? [shape.viewport] : PREPARED_SIZES;
        return sizes.flatMap((size) => [
            planned(size, 'light'),
            ...(shape.theme === 'dark' ? [planned(size, 'dark')] : [])
        ]);
    }

    if (shape.viewport || shape.theme) return [];

    const extra = locales.filter((locale) => locale !== DEFAULT_LOCALE);
    return [
        ...PLAIN_SHOTS.map(({ viewport, theme }) => planned(viewport, theme)),
        ...extra.map((locale) => planned('phone', 'light', locale))
    ];
};

/**
 * Expands every case of a sweep and checks that no two shots share an id.
 *
 * @param shapes - the sweep's cases
 * @param module - the module slug that starts every id
 * @param locales - the locales to cover
 * @throws {RangeError} when two shots would share an id, so one would overwrite the other
 */
export const expandCaptureCases = (
    shapes: readonly CaptureCaseShape[],
    module: string,
    locales: readonly string[] = [DEFAULT_LOCALE]
): { shape: CaptureCaseShape; shots: PlannedShot[] }[] => {
    const expanded = shapes.map((shape) => ({ shape, shots: expandCase(shape, module, locales) }));

    const seen = new Set<string>();
    for (const { id } of expanded.flatMap(({ shots }) => shots)) {
        if (seen.has(id)) throw new RangeError(`two capture shots share the id ${id}`);
        seen.add(id);
    }
    return expanded;
};

/**
 * The states an action-table row is photographed in: the others (`first-paint`, `prepared`) belong
 * to the sweeps.
 */
export type ActionState = 'loading' | 'error' | 'empty';

/**
 * The slice of an action-table row the matrix needs.
 */
export interface ActionRowShape {
    /** The row's position in its table: names are long sentences, so the index keeps ids apart. */
    index: number;
    /** The row's `name`. */
    name: string;
    /** What the row exercises (`ActionKind` in `action-table.ts`). */
    kind: 'form' | 'dialog' | 'row' | 'read' | 'empty' | 'slow';
}

/**
 * One planned shot of an action-table row.
 */
export interface PlannedActionShot extends PlannedShot {
    /** Which state the shot holds the page in. */
    state: ActionState;
}

/**
 * How much of a row's name goes into a shot id: file names stay short enough for every file
 * system, and the index in front keeps two rows with the same opening words apart.
 */
const ACTION_SLUG_LENGTH = 48;

/**
 * The states a row is photographed in.
 *
 * A `read` or `empty` row holds its request open for a loading shot first. A `form`, `dialog` or
 * `row` row has no read of its own to hold, so it gives only its error. A `slow` row is a read
 * held back on purpose to test typing, not a state a reviewer judges, so it gives nothing.
 *
 * @param kind - the row's kind
 */
export const statesOfAction = (kind: ActionRowShape['kind']): ActionState[] => {
    if (kind === 'read') return ['loading', 'error'];
    if (kind === 'empty') return ['loading', 'empty'];
    if (kind === 'slow') return [];
    return ['error'];
};

/**
 * The shots one action-table row becomes: each state at phone and desktop, light only.
 *
 * Phone and desktop because a dialog is fullscreen on one and floats on the other; light only
 * because a state's colours are the sweeps' business, not the row's.
 *
 * @param shape - the row
 * @param module - the module slug that starts every id
 */
export const expandActionRow = (shape: ActionRowShape, module: string): PlannedActionShot[] => {
    const slug = slugOf(shape.name).slice(0, ACTION_SLUG_LENGTH).replaceAll(/-$/g, '');
    return statesOfAction(shape.kind).flatMap((state) =>
        PREPARED_SIZES.map((viewport): PlannedActionShot => ({
            id: `${module}--row-${String(shape.index)}-${slug}-${state}--${viewport}--light`,
            viewport,
            theme: 'light',
            locale: DEFAULT_LOCALE,
            state
        }))
    );
};

/**
 * Expands every row of an action table and checks that no two shots share an id.
 *
 * @param rows - the table's rows, in order
 * @param module - the module slug that starts every id
 * @throws {RangeError} when two shots would share an id, so one would overwrite the other
 */
export const expandActionRows = (
    rows: readonly Omit<ActionRowShape, 'index'>[],
    module: string
): PlannedActionShot[][] => {
    const expanded = rows.map((row, index) => expandActionRow({ ...row, index }, module));

    const seen = new Set<string>();
    for (const { id } of expanded.flat()) {
        if (seen.has(id)) throw new RangeError(`two capture shots share the id ${id}`);
        seen.add(id);
    }
    return expanded;
};
