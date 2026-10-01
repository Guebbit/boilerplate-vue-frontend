/**
 * The amount a money text shows, as an integer count of cents, in any locale.
 *
 * Pure, and outside `tests/support/e2e/` on purpose, so the unit suite can pin it without a
 * browser — the same split `mail-message.ts` makes.
 */

/**
 * The cents a money text shows, in any locale: every digit, read as an integer.
 *
 * Every currency this shop sells in has two decimals, so `€1,234.50` and `1.234,50 €` are both
 * 123450. Comparing cents asks "are these the same amount" without asking how it is spelled.
 *
 * @param text - what a money element shows
 * @throws {Error} when the text has no digit, naming what it held
 */
export const cents = (text: string): number => {
    const digits = text.replaceAll(/\D/g, '');
    if (digits === '') throw new Error(`cents(): no amount in "${text}"`);
    return Number(digits);
};

/**
 * The cents of several money texts added together.
 *
 * @param texts - what each money element shows
 * @throws {Error} when any text has no digit
 */
export const sumCents = (texts: readonly string[]): number => {
    let total = 0;
    for (const text of texts) total += cents(text);
    return total;
};
