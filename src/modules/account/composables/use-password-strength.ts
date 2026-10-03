/**
 * @module
 * Client-side password strength, scored locally with zxcvbn on every keystroke — advisory only,
 * same as `use-password-breach-check.ts` beside it. The two are deliberately separate composables:
 * this one never calls the network, and the breach check never loads zxcvbn's dictionaries, so a
 * page using only one pays for only one.
 */
import { ref, watch, type Ref } from 'vue';
import type { ZxcvbnFactory } from '@zxcvbn-ts/core';

/**
 * Loads zxcvbn and its dictionaries (a few MB) on first use rather than at module load, and
 * caches the instance so every password field on every page shares the one build. A dynamic
 * `import()` here is what lets Vite split it into its own chunk — a signup page must not pay for
 * this before anyone has focused a password field.
 *
 * https://github.com/zxcvbn-ts/zxcvbn#setup
 */
let zxcvbnPromise: Promise<ZxcvbnFactory> | undefined;

/** Resolves the shared zxcvbn instance, building it on the first call. */
const loadZxcvbn = (): Promise<ZxcvbnFactory> => {
    zxcvbnPromise ??= Promise.all([
        import('@zxcvbn-ts/core'),
        import('@zxcvbn-ts/language-common'),
        import('@zxcvbn-ts/language-en')
    ])
        .then(
            ([{ ZxcvbnFactory }, commonPackage, enPackage]) =>
                // zxcvbn-ts `new ZxcvbnFactory(options)`: `dictionary` = word lists to match
                // against, `graphs` = keyboard adjacency for pattern detection,
                // `translations` = the feedback wording.
                // https://zxcvbn-ts.github.io/zxcvbn/guide/getting-started/
                new ZxcvbnFactory({
                    dictionary: {
                        ...commonPackage.dictionary,
                        ...enPackage.dictionary
                    },
                    graphs: commonPackage.adjacencyGraphs,
                    translations: enPackage.translations
                })
        )
        // A transient failure (e.g. offline) must not cache a broken promise forever — the next
        // keystroke gets a fresh attempt instead of a permanently silent meter.
        .catch((error: unknown) => {
            zxcvbnPromise = undefined;
            throw error;
        });
    return zxcvbnPromise;
};

/**
 * Local strength score for one password field. Advisory only — a component using this must never
 * treat the score as a reason to block submission; the schema plus the server's own checks are
 * the actual gate.
 *
 * @param password - The candidate, read reactively on every change.
 * @returns `score` — zxcvbn's own 0–4 scale, `undefined` for an empty field or before the
 *  dictionary chunk has resolved.
 */
export const usePasswordStrength = (password: Ref<string>) => {
    const score = ref<0 | 1 | 2 | 3 | 4>();

    watch(
        password,
        (candidate) => {
            if (!candidate) {
                score.value = undefined;
                return;
            }
            // Fire-and-forget: the score is read reactively from `score`, and the guard inside
            // handles a keystroke that lands before the (usually cached) chunk resolves. A failed
            // chunk load (e.g. offline) just means no meter shows — advisory only, nothing to gate.
            void loadZxcvbn()
                .then((zxcvbn) => {
                    // A newer keystroke, or an emptied field, may land before the chunk resolves.
                    if (password.value === candidate) score.value = zxcvbn.check(candidate).score;
                })
                .catch(() => undefined);
        },
        { immediate: true }
    );

    return { score };
};
