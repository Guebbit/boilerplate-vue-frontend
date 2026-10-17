/**
 * @module
 * The one place that touches driver.js. `startTour(id)` assembles the tour's steps (drops anchors
 * that are not on screen), translates them, shows them, and records the tour as seen when it
 * closes — finished, skipped or dismissed with Esc all count. driver.js and its stylesheet load
 * on first use, so they never join the boot bundle. See `docs/tools/tours.md`.
 */
import { useI18n } from 'vue-i18n';
import type { DriveStep } from 'driver.js';
import { hasSeenTour, markTourSeen, tourSeenKey } from '@/infrastructure/tour-seen.ts';
import { readToursEnabled } from '@/infrastructure/runtime-config.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import {
    isKnownTour,
    stepsOfTour,
    tourSelector,
    TOURS,
    visibleSteps
} from '@/app/tours/catalogue.ts';

/**
 * Whether an anchor is in the DOM and actually painted — `display: none` ancestors (the desktop
 * bar on a phone) count as absent. `checkVisibility` is missing in older engines and in jsdom,
 * where "in the DOM" has to do.
 *
 * @param target - A step's `data-tour` value.
 * @returns `true` when the step can point at something.
 */
export const isAnchorVisible = (target: string): boolean => {
    const element = document.querySelector(tourSelector(target));
    if (!element) return false;
    return typeof element.checkVisibility === 'function' ? element.checkVisibility() : true;
};

/**
 * How often, and for how long, a tour waits for its anchors to appear.
 */
const ANCHOR_POLL_MS = 100;

/**
 * Upper bound of the wait above; past it the tour is dropped without a word.
 */
const ANCHOR_WAIT_MS = 5000;

/**
 * The popover on screen, or `undefined`. One tour at a time: a second request while one is open
 * (the auto-open and a `?tour=` in the same tick) is dropped rather than stacked.
 */
let active: { isActive: () => boolean } | undefined;

/**
 * The tour runner, bound to the current i18n and session.
 *
 * @returns `startTour` and `hasSeen`.
 */
export const useTour = () => {
    /**
     * Translation function for step headings and texts, and the button labels.
     */
    const { t } = useI18n();

    /**
     * The signed-in account, whose id is part of the seen key.
     */
    const session = useSessionStore();

    /**
     * The seen key for the current account and the tour's current version.
     *
     * @param tourId - A catalogue id.
     */
    const seenKeyOf = (tourId: string): string =>
        tourSeenKey(session.viewer?.id, tourId, TOURS[tourId].version);

    /**
     * Whether this browser already showed the current account this version of the tour.
     *
     * @param tourId - A catalogue id.
     */
    const hasSeen = (tourId: string): boolean =>
        isKnownTour(tourId) && hasSeenTour(seenKeyOf(tourId));

    /**
     * Translates the visible steps into driver.js's step shape.
     *
     * @param tourId - A catalogue id.
     */
    const driveSteps = (tourId: string): DriveStep[] =>
        visibleSteps(stepsOfTour(tourId), isAnchorVisible).map((step) => ({
            element: tourSelector(step.target),
            popover: { title: t(step.title), description: t(step.body) }
        }));

    /**
     * Resolves with the tour's visible steps once at least one anchor is on screen, or with none
     * after {@link ANCHOR_WAIT_MS}. A screen's anchors arrive a moment after its route does (the
     * session restores, the cart loads), so asking once at navigation time would find nothing.
     *
     * @param tourId - A catalogue id.
     */
    const whenAnchored = (tourId: string): Promise<DriveStep[]> =>
        new Promise((resolve) => {
            const startedAt = Date.now();
            const look = () => {
                const steps = driveSteps(tourId);
                if (steps.length > 0 || Date.now() - startedAt >= ANCHOR_WAIT_MS) resolve(steps);
                else setTimeout(look, ANCHOR_POLL_MS);
            };
            look();
        });

    /**
     * Shows a tour. Resolves `false`, and shows nothing, when tours are off, the id is unknown,
     * another tour is open or no step ever gets an anchor on this screen.
     *
     * @param tourId - A catalogue id.
     * @returns Whether a tour opened.
     */
    const startTour = (tourId: string): Promise<boolean> => {
        if (!readToursEnabled() || !isKnownTour(tourId) || active?.isActive())
            return Promise.resolve(false);
        // Held while waiting for anchors, so a second request in the same tick is dropped.
        active = { isActive: () => true };

        const seenKey = seenKeyOf(tourId);

        return whenAnchored(tourId)
            .then((steps) =>
                steps.length === 0
                    ? undefined
                    : Promise.all([import('driver.js'), import('driver.js/dist/driver.css')]).then(
                          ([{ driver }]) => ({ driver, steps })
                      )
            )
            .then((loaded) => {
                if (!loaded) {
                    active = undefined;
                    return false;
                }
                // Recorded on open, not on close: a reload mid-tour must not bring it straight back.
                markTourSeen(seenKey);
                // driver.js `driver(config)`: https://driverjs.com/docs/configuration
                const tour = loaded.driver({
                    steps: loaded.steps,
                    showProgress: true, // "2 of 5" in the popover footer
                    // driver.js fills `{{current}}` and `{{total}}` itself; vue-i18n cannot hold them, so they join the translated word here.
                    progressText: `{{current}} ${t('tours.progress-of')} {{total}}`,
                    nextBtnText: t('tours.next'),
                    prevBtnText: t('tours.previous'),
                    doneBtnText: t('tours.done')
                });
                active = tour;
                // `drive()` shows the first step; the user walks on with the buttons or arrow keys.
                tour.drive();
                return true;
            })
            .catch((error: unknown) => {
                active = undefined;
                throw error;
            });
    };

    return { startTour, hasSeen };
};
