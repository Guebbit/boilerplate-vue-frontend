/**
 * @module
 * Renders a 2FA method's wire name as copy, without ever branching on which method it is: a
 * locale key exists for a name this build recognises (`two-factor.method-email`, `.method-totp`),
 * and the raw wire string is the fallback for one it doesn't — which is what keeps a method this
 * deployment adds later (`sms`, say) readable with no code change here.
 *
 * A composable rather than a pure helper taking `t`: resolving copy IS an i18n concern, and
 * threading `t`/`te` through every call site only moved that dependency into the arguments. `te`
 * is called on the composer rather than destructured — its method-shorthand signature carries an
 * implicit `this`, which destructuring would unbind.
 */
import { useI18n } from 'vue-i18n';

/**
 * @returns `{ methodLabel }`, resolved against the active locale.
 */
export const useMethodLabel = () => {
    /**
     * The i18n runtime: the translator plus the active locale.
     */
    const i18n = useI18n();

    /**
     * @param method - Wire name of the method, e.g. `'email'`, `'totp'`.
     * @returns The translated label, or `method` itself when this build has no copy for it.
     */
    const methodLabel = (method: string): string => {
        const key = `two-factor.method-${method}`;
        return i18n.te(key) ? i18n.t(key) : method;
    };

    return { methodLabel };
};
