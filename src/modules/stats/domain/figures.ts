/**
 * @module
 * Small pure rules over the figures the stats API returns.
 */

/**
 * How much a figure moved against the period before it.
 *
 * @param current - This period's figure.
 * @param previous - The equal-length period before it.
 * @returns The change as a fraction (`0.1` is +10%), or `undefined` when there is nothing to
 *  compare against: a percentage of zero is no number at all.
 */
export const percentChange = (current: number, previous: number): number | undefined =>
    previous === 0 ? undefined : (current - previous) / Math.abs(previous);

/**
 * Whether a change is worth a "no change" label rather than an arrow.
 *
 * @param change - A fraction from {@link percentChange}.
 * @returns `true` when it rounds to zero at the one decimal the cards show.
 */
export const isFlat = (change: number): boolean => Math.abs(change) < 0.0005;
