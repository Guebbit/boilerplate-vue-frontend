/**
 * @module
 * Pure 2FA helpers shared by every component that renders a `method` string — kept out of the
 * components themselves so none of them is tempted to special-case a method by name.
 */

/**
 * Renders a method's wire name as copy, without ever branching on which method it is: a locale
 * key exists for a name this build recognises (`two-factor.method-email`, `.method-totp`), and
 * the raw wire string is the fallback for one it doesn't — which is what keeps a method this
 * deployment adds later (`sms`, say) readable with no code change here.
 *
 * @param t - Translation function, resolved for the active locale.
 * @param te - Existence check for the same dictionary.
 * @param method - Wire name of the method, e.g. `'email'`, `'totp'`.
 * @returns The translated label, or `method` itself when this build has no copy for it.
 */
export const methodLabel = (
    t: (key: string) => string,
    te: (key: string) => boolean,
    method: string
): string => (te(`two-factor.method-${method}`) ? t(`two-factor.method-${method}`) : method);
