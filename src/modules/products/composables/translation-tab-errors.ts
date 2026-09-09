/**
 * @module
 * Turns a `productsSchema` validation result — and a rejected `PATCH`'s field pointers — into a
 * per-locale error count, so `ProductCreate.vue`/`ProductEdit.vue` can badge the language tab that
 * actually owns a failure. `useStructureFormValidation.formErrors` cannot do this itself: it keys
 * every error by `issue.path[0]` (see its own source), so every locale's title/description issue
 * collapses into one flat `translations` bucket with no way to tell which language failed.
 */
import type { ZodError } from 'zod';

/**
 * One Zod issue, narrowed to the two fields this module reads. Kept minimal — rather than naming
 * `zod`'s own issue type — so a schema swap only breaks this file if the shape it actually uses
 * changes.
 */
interface TranslationIssue {
    path: PropertyKey[];
    message: string;
}

/**
 * Error message count per locale, e.g. `{ it: 2, es: 1 }` — what a tab's badge renders. A locale
 * with no issues is simply absent, so `Object.keys(...).length` also answers "any errors at all".
 */
export type TranslationTabErrorCounts = Record<string, number>;

/**
 * Narrows a value to a plain keyed object — the one predicate
 * {@link translationTabErrorCountsFromServerError} needs to pick apart an unknown rejection.
 *
 * @param value - Anything.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/**
 * Locale tag out of an issue path shaped `['translations', <locale>, ...rest]`, or `undefined`
 * for any issue that is not about a specific language slot (a whole-body refinement, or a failure
 * on a top-level field like `price`).
 *
 * @param path - One issue's path, exactly as Zod reports it.
 */
const localeOf = (path: PropertyKey[]): string | undefined =>
    path[0] === 'translations' && typeof path[1] === 'string' ? path[1] : undefined;

/**
 * Buckets a list of Zod issues (or, identically shaped, the entries a rejected write's
 * `translations.<locale>.<field>` pointers produce) by the locale they belong to.
 *
 * @param issues - Every issue from one `safeParse` call, or a hand-built list from a server 422.
 * @returns How many issues each locale owns.
 */
export const translationTabErrorCounts = (
    issues: TranslationIssue[]
): TranslationTabErrorCounts => {
    const counts: TranslationTabErrorCounts = {};
    for (const issue of issues) {
        const locale = localeOf(issue.path);
        if (!locale) continue;
        counts[locale] = (counts[locale] ?? 0) + 1;
    }
    return counts;
};

/**
 * {@link translationTabErrorCounts} run straight off a Zod parse failure.
 *
 * @param error - The `ZodError` a failed `safeParse` produced.
 */
export const translationTabErrorCountsFromZodError = (error: ZodError): TranslationTabErrorCounts =>
    translationTabErrorCounts(error.issues);

/**
 * A rejected write's `translations.<locale>.<field>` field pointers, turned into the same
 * per-locale counts — the API names the language in the error pointer itself (`details.field`,
 * e.g. `translations.it.title`), so the locale is not lost the way it is once the same rejection
 * passes through `formErrors`'s flat top-level bucket.
 *
 * Narrows `unknown` by hand rather than importing the envelope type: this reads the rejection
 * exactly as `useStructureFormValidation.applyServerErrors` does (`error.errors`, or
 * `error.data.errors`, or `error.response.data.errors`) but keeps the locale its flat
 * `formErrors.translations` bucket loses.
 *
 * @param error - The rejected value, exactly as caught from a store write.
 */
export const translationTabErrorCountsFromServerError = (
    error: unknown
): TranslationTabErrorCounts => {
    const container = [
        error,
        isRecord(error) ? error.data : undefined,
        ...(isRecord(error) && isRecord(error.response) ? [error.response.data] : [])
    ].find((candidate): candidate is Record<string, unknown> => isRecord(candidate));

    const items = isRecord(container) && Array.isArray(container.errors) ? container.errors : [];

    const issues: TranslationIssue[] = items.flatMap((item) => {
        if (!isRecord(item) || !isRecord(item.details)) return [];
        const { field } = item.details;
        if (typeof field !== 'string' || !field.startsWith('translations.')) return [];
        return [
            {
                path: field.split('.'),
                message: typeof item.message === 'string' ? item.message : ''
            }
        ];
    });

    return translationTabErrorCounts(issues);
};
