/**
 * @module
 * `useI18n()`'s `t`/`te` pair, safe to destructure — `te`'s type is a method-shorthand signature
 * that carries an implicit `this`, so destructuring it directly unbinds that and trips
 * `@typescript-eslint/unbound-method`. `t` does not have the same issue (every other view already
 * destructures it directly), so only `te` needs the wrapper.
 */
import { useI18n } from 'vue-i18n';

/**
 * @returns `{ t, te }`, both safe to use directly — `te` re-wrapped as a plain arrow function.
 */
export const useSafeI18n = () => {
    const i18n = useI18n();
    return {
        t: i18n.t,
        te: (key: string) => i18n.te(key)
    };
};
