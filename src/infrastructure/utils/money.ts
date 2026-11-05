/**
 * @module
 * Money as the API sends it: a decimal string at the currency's own places (`"19.90"`, JPY `"1000"`,
 * KWD `"1.500"`). The text carries its own scale, so the client keeps no table of currencies.
 *
 * Arithmetic runs on whole minor units in `BigInt` and is written back at the same scale: no float
 * ever touches an amount. Pure, no Vue. See `docs/modules/cart.md` (Money on the wire).
 */

/**
 * A plain decimal as the API writes it: optional minus, digits, optional fraction.
 */
const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

/**
 * A non-negative plain decimal, as a money field may hold: digits with an optional fraction.
 */
export const NON_NEGATIVE_DECIMAL = /^\d+(\.\d+)?$/;

/**
 * Splits an amount into its sign, whole digits and fraction digits.
 *
 * @param text - A decimal string, e.g. `"-19.90"`.
 * @returns The parts, or `undefined` when `text` is not a plain decimal.
 */
const partsOf = (text: string) => {
    const match = DECIMAL.exec(text);
    return match
        ? {
              negative: match[1] === '-',
              whole: match[2],
              // A group that did not take part is `undefined` at runtime, though typed `string`.
              fraction: (match[3] as string | undefined) ?? ''
          }
        : undefined;
};

/**
 * Whether text is a plain decimal amount (`"19.90"`, `"-5"`).
 *
 * @param text - Any string.
 * @returns `true` for digits with an optional sign and fraction.
 */
export const isDecimal = (text: string): boolean => DECIMAL.test(text);

/**
 * How many places an amount is written with.
 *
 * @param text - A decimal string.
 * @returns The fraction length: `"19.90"` is 2, `"1000"` is 0; 0 for text that is not a decimal.
 */
export const decimalScale = (text: string): number => partsOf(text)?.fraction.length ?? 0;

/**
 * An amount as a whole number of its smallest unit (`"19.90"` is `1990n`).
 *
 * @param text - A decimal string.
 * @returns The minor units, `0n` for text that is not a decimal.
 */
export const toMinor = (text: string): bigint => {
    const parts = partsOf(text);
    if (parts === undefined) return 0n;
    const minor = BigInt(parts.whole + parts.fraction);
    return parts.negative ? -minor : minor;
};

/**
 * Writes minor units back as a decimal string at a scale.
 *
 * @param minor - The amount in the smallest unit.
 * @param scale - How many places to write.
 * @returns e.g. `fromMinor(1990n, 2)` is `"19.90"`, `fromMinor(5n, 3)` is `"0.005"`.
 */
export const fromMinor = (minor: bigint, scale: number): string => {
    const digits = (minor < 0n ? -minor : minor).toString().padStart(scale + 1, '0');
    const cut = digits.length - scale;
    const body = scale === 0 ? digits : `${digits.slice(0, cut)}.${digits.slice(cut)}`;
    return minor < 0n ? `-${body}` : body;
};

/**
 * Re-expresses an amount at a larger scale, so two amounts can be added.
 *
 * @param text - A decimal string.
 * @param scale - The scale to reach; never smaller than the text's own.
 * @returns The minor units at `scale`.
 */
const toMinorAt = (text: string, scale: number): bigint =>
    toMinor(text) * 10n ** BigInt(scale - decimalScale(text));

/**
 * Adds amounts exactly. The result carries the widest scale among the inputs.
 *
 * @param amounts - Decimal strings.
 * @returns The sum as a decimal string; `"0"` for no amounts.
 */
export const sumDecimals = (amounts: readonly string[]): string => {
    const scale = Math.max(0, ...amounts.map((amount) => decimalScale(amount)));
    return fromMinor(
        amounts.reduce((sum, amount) => sum + toMinorAt(amount, scale), 0n),
        scale
    );
};

/**
 * Multiplies an amount by a whole count (a line's unit price by its quantity), exactly.
 *
 * @param amount - A decimal string.
 * @param quantity - How many units.
 * @returns The product at the amount's own scale.
 */
export const multiplyDecimal = (amount: string, quantity: number): string =>
    fromMinor(toMinor(amount) * BigInt(quantity), decimalScale(amount));

/**
 * Compares two amounts by value, so `"71"` and `"71.00"` are equal.
 *
 * @param a - A decimal string.
 * @param b - A decimal string.
 * @returns Negative when `a < b`, zero when equal, positive when `a > b`.
 */
export const compareDecimals = (a: string, b: string): number => {
    const scale = Math.max(decimalScale(a), decimalScale(b));
    const diff = toMinorAt(a, scale) - toMinorAt(b, scale);
    if (diff === 0n) return 0;
    return diff < 0n ? -1 : 1;
};

/**
 * An amount that is zero, at a scale.
 *
 * @param scale - How many places to write.
 * @returns `"0"`, `"0.00"`, `"0.000"`…
 */
export const zeroDecimal = (scale: number): string => fromMinor(0n, scale);

/**
 * Normalises a money input's text to a scale, as the API wants it. A typed value with more places
 * than the currency is left as typed, so the server's refusal reaches the user.
 *
 * @param text - What the user typed, e.g. `"12.5"`.
 * @param scale - The currency's places (from `GET /shop`'s `minorUnits`).
 * @returns `"12.50"`, or `text` unchanged when it is not a decimal or has more places than `scale`.
 */
export const padDecimal = (text: string, scale: number): string =>
    decimalScale(text) > scale || partsOf(text) === undefined
        ? text
        : fromMinor(toMinorAt(text, scale), scale);

/**
 * Escapes text for use inside a regular expression.
 *
 * @param text - Literal text.
 * @returns `text` with every regex metacharacter escaped.
 */
const escapeRegExp = (text: string): string =>
    text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);

/**
 * Reads a typed amount in the viewer's number format back into the plain decimal the API takes
 * (`"1.234,50"` in Italian becomes `"1234.50"`). The group and decimal marks come from the locale
 * itself. A group mark must be followed by exactly three digits, so the other locale's spelling is
 * refused instead of read as a different amount: Italian `41.50` (a dot is its group mark) and
 * English `41,50` both fail. A refusal is returned with a `?` appended, which never passes the
 * pattern check, so the field shows its normal invalid-amount message and nothing is sent.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts
 * A number past a million, so locales that group only from five digits (Italian) still show a mark.
 *
 * @param text - What the user typed.
 * @param locale - A BCP 47 tag; `undefined` uses the runtime default.
 * @returns The plain decimal; the trimmed input when it does not read as one; or a refusal.
 */
export const normalizeAmount = (text: string, locale?: string): string => {
    const trimmed = text.trim();
    const parts = new Intl.NumberFormat(locale).formatToParts(1_234_567.5);
    const mark = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    const group = mark('group');
    const decimal = mark('decimal') || '.';
    const [whole = '', ...rest] = trimmed.split(decimal);
    const [fraction, ...extra] = rest;
    // Group marks must sit between a leading 1-3 digits and blocks of exactly three.
    const grouped = group !== '' && whole.includes(group);
    const wellGrouped =
        !grouped || new RegExp(String.raw`^\d{1,3}(?:${escapeRegExp(group)}\d{3})+$`).test(whole);
    if (extra.length > 0 || !wellGrouped) return `${trimmed}?`;
    const plain = `${grouped ? whole.replaceAll(group, '') : whole}${rest.length === 0 ? '' : `.${fraction}`}`;
    return isDecimal(plain) ? plain : trimmed;
};

/**
 * A typed filter bound as the decimal text the API takes: nothing for a blank or non-decimal box.
 * Not padded: a filter has no single currency.
 *
 * @param text - The raw field, in the viewer's number format.
 * @param locale - The active locale, to read that format.
 * @returns The plain decimal, or `undefined`.
 */
export const boundOf = (text: string | undefined, locale?: string): string | undefined => {
    const plain = normalizeAmount(text ?? '', locale);
    return NON_NEGATIVE_DECIMAL.test(plain) ? plain : undefined;
};
