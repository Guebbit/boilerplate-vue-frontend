/**
 * @module
 * Prices the cart screens compute themselves: a guest cart has no server answer, and a signed-in
 * line shows `unit × quantity`. Done in whole minor units so `0.1 × 3` is `0.3`, not
 * `0.30000000000000004`. Pure: the currency's decimals come in as an argument.
 */
import { fromMinorUnits } from './expected-total';

/**
 * One priced line.
 */
export interface PricedLine {
    /** The product's price for one unit, a decimal at the currency's own precision. */
    unitPrice: number;
    /** How many units. */
    quantity: number;
}

/**
 * What these lines cost together, summed in whole minor units.
 *
 * @param lines - the priced lines
 * @param digits - the currency's decimal places (2 for EUR, 0 for JPY, 3 for KWD)
 * @returns the total as a decimal
 */
export const linesTotal = (lines: readonly PricedLine[], digits: number): number =>
    fromMinorUnits(
        lines.reduce(
            (sum, { unitPrice, quantity }) => sum + Math.round(unitPrice * 10 ** digits) * quantity,
            0
        ),
        digits
    );

/**
 * What one line costs.
 *
 * @param unitPrice - the price for one unit
 * @param quantity - how many units
 * @param digits - the currency's decimal places
 * @returns the line total as a decimal
 */
export const lineTotal = (unitPrice: number, quantity: number, digits: number): number =>
    linesTotal([{ unitPrice, quantity }], digits);
