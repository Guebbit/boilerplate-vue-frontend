/**
 * @module
 * The guided-tour catalogue: which tours exist, their versions, and the steps the shell itself
 * owns (the app bar). Module steps arrive through `AppModule.tours`; {@link stepsOfTour} merges
 * both and drops what cannot be shown. Pure functions only — `use-tour.ts` is what talks to the
 * DOM and to driver.js. See `docs/tools/tours.md`.
 */
import { collectModuleTours } from '@/kernel/registry';
import type { AppTourStep } from '@/kernel/registry';
import { enabledModules } from '@/modules';

/**
 * Id of the tour that opens by itself after a first sign-in and from the account menu.
 */
export const WELCOME_TOUR_ID = 'welcome';

/**
 * What the shell knows about one tour.
 */
export interface TourDefinition {
    /**
     * Bumping it shows the tour once more to everyone: the seen record is keyed by it.
     */
    version: number;

    /**
     * Opens by itself after the first sign-in on a browser. Only `welcome` does; page tours open
     * from their "?" button or `?tour=` and never on their own.
     */
    auto?: boolean;
}

/**
 * Every tour this build can run, by id. A `?tour=` value outside this table is ignored.
 */
export const TOURS: Record<string, TourDefinition> = {
    [WELCOME_TOUR_ID]: { version: 1, auto: true },
    checkout: { version: 1 },
    'order-staff': { version: 1 },
    'stock-board': { version: 1 }
};

/**
 * Whether `tourId` is in {@link TOURS}. An unknown `?tour=` value is ignored silently.
 *
 * @param tourId - Any string, typically from the URL.
 * @returns `true` for a catalogued tour.
 */
export const isKnownTour = (tourId: string): boolean => Object.hasOwn(TOURS, tourId);

/**
 * The app bar's own steps for the welcome tour. They point at `data-tour` anchors in
 * `AppNavigation.vue`; a step whose anchor is absent for this account (no admin menu, no cart,
 * a phone with no desktop bar) is dropped by {@link visibleSteps}.
 */
const SHELL_STEPS: AppTourStep[] = [
    {
        tour: WELCOME_TOUR_ID,
        id: 'nav-main',
        target: 'nav-main',
        title: 'tours.welcome-nav-title',
        body: 'tours.welcome-nav-body',
        order: 10
    },
    {
        tour: WELCOME_TOUR_ID,
        id: 'menu-toggle',
        target: 'menu-toggle',
        title: 'tours.welcome-menu-toggle-title',
        body: 'tours.welcome-menu-toggle-body',
        order: 10
    },
    {
        tour: WELCOME_TOUR_ID,
        id: 'admin-menu',
        target: 'admin-menu',
        title: 'tours.welcome-admin-title',
        body: 'tours.welcome-admin-body',
        order: 20
    },
    {
        tour: WELCOME_TOUR_ID,
        id: 'cart',
        target: 'pinned-Cart',
        title: 'tours.welcome-cart-title',
        body: 'tours.welcome-cart-body',
        order: 30
    },
    {
        tour: WELCOME_TOUR_ID,
        id: 'user-menu',
        target: 'user-menu',
        title: 'tours.welcome-account-title',
        body: 'tours.welcome-account-body',
        order: 90
    }
];

/**
 * Every step known to this build: the shell's plus each enabled module's.
 */
const ALL_STEPS: AppTourStep[] = [...SHELL_STEPS, ...collectModuleTours(enabledModules)];

/**
 * CSS selector for a step's anchor.
 *
 * @param target - The step's `data-tour` value.
 * @returns A selector matching that attribute.
 */
export const tourSelector = (target: string): string => `[data-tour="${target}"]`;

/**
 * The steps of one tour, in order.
 *
 * @param tourId - The tour's catalogue id.
 * @param steps - Every known step; defaults to this build's.
 * @returns The tour's steps sorted by `order`, absent order last.
 */
export const stepsOfTour = (tourId: string, steps: AppTourStep[] = ALL_STEPS): AppTourStep[] =>
    steps
        .filter(({ tour }) => tour === tourId)
        .toSorted(
            ({ order: a }, { order: b }) =>
                (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER)
        );

/**
 * Keeps the steps whose anchor is on screen right now, which is the whole per-role story: nav
 * entries a role cannot see are never rendered, so their steps fall away with them.
 *
 * @param steps - One tour's steps.
 * @param isVisible - Whether an anchor exists and is shown; takes the step's `data-tour` value.
 * @returns The steps that can be shown.
 */
export const visibleSteps = (
    steps: AppTourStep[],
    isVisible: (target: string) => boolean
): AppTourStep[] => steps.filter(({ target }) => isVisible(target));
