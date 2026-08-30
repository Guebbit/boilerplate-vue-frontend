/**
 * @module
 * Zod validation schemas for the locale admin's forms, with error messages built as thunks so
 * they translate lazily at parse time rather than freezing into whatever locale was active when
 * the schema was created.
 */
import { z } from 'zod';
import { translate } from '@/infrastructure/i18n';

/**
 * Validation schemas for the locale admin's two forms.
 *
 * Messages are thunks resolved at parse time — see {@link translate} for why. It matters more here
 * than anywhere else in the app: this is the screen where a visitor changes the language, and
 * error text built as a plain string would stay in the old one while the labels around it moved.
 */

/**
 * A language tag as the contract accepts it: primary subtag, optional region.
 *
 * `pt-BR`, not `pt-br` and not `por`. The region's case carries meaning in BCP 47, and the API
 * stores the tag as given.
 */
const LANGUAGE_TAG_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * Validation schema of the language form.
 *
 * `tag` is validated here for the CREATE case. Editing shows it disabled — it is what every entry
 * references, so the API keeps it immutable — and the dialog swaps this schema for
 * {@link localesLanguageEditSchema} rather than making the field conditionally optional, which
 * would leave a required field silently unchecked on the form that does write it.
 */
export const localesLanguageSchema = z.object({
    tag: z
        .string()
        .min(1, { error: () => translate('locale-form.tag-required') })
        .regex(LANGUAGE_TAG_PATTERN, { error: () => translate('locale-form.tag-invalid') }),
    name: z.string().min(1, { error: () => translate('locale-form.name-required') }),
    nativeName: z.string().min(1, { error: () => translate('locale-form.native-name-required') }),
    direction: z.enum(['ltr', 'rtl']),
    active: z.boolean()
});

/**
 * The same form on edit, where the tag is shown but not writable.
 */
export const localesLanguageEditSchema = localesLanguageSchema.extend({
    tag: z.string()
});

/**
 * Validation schema of the entry form — adding only. A stored entry's key is immutable and its
 * value edits inline in the table, so a row never comes back through the dialog.
 */
export const localesEntrySchema = z.object({
    // An id from the registry the dialog lists; the API refuses a stranger with a 422.
    tenant: z.string().min(1, { error: () => translate('entry-form.tenant-required') }),
    key: z.string().min(1, { error: () => translate('entry-form.key-required') }),
    value: z.string().min(1, { error: () => translate('entry-form.value-required') })
});
