/**
 * @module
 * ISO 4217 minor-unit exponents, pinned in-repo — the table the backend pins as
 * `src/domain-primitives/money.ts`. A currency's exponent decides how a stored amount is read, so
 * it must not follow a runtime's display table: `Intl` (CLDR) answers 0 for HUF, IDR, COP, PKR,
 * LBP and IQD, where ISO 4217 says 2, 2, 2, 2, 2 and 3.
 * https://www.six-group.com/en/products-services/financial-information/data-standards.html
 *
 * Exponent 2 is the rule, so only the exceptions are listed. A code the table does not list gets 2,
 * the rule the standard itself follows for almost every currency.
 */

/**
 * The currencies whose minor unit is not a hundredth, under the exponent ISO publishes for them.
 */
const ISO_4217_EXCEPTIONS: Readonly<Record<string, number>> = Object.fromEntries(
    (
        [
            [0, 'BIF CLP DJF GNF ISK JPY KMF KRW PYG RWF UGX UYI VND VUV XAF XOF XPF'],
            [3, 'BHD IQD JOD KWD LYD OMR TND'],
            [4, 'CLF UYW']
        ] as const
    ).flatMap(([exponent, codes]) => codes.split(/\s+/).map((code) => [code, exponent] as const))
);

/**
 * How many decimal places a currency's minor unit represents — 2 for EUR/USD, 0 for JPY/KRW, 3 for
 * KWD/BHD — so a price input's `step` and a displayed amount agree with what the server stores.
 * @param currency - an ISO 4217 code
 * @returns the number of decimal places that currency's minor unit represents
 */
export const minorUnitExponent = (currency: string): number =>
    ISO_4217_EXCEPTIONS[currency.toUpperCase()] ?? 2;
