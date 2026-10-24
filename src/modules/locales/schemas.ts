/**
 * @module
 * Zod validation schemas for the locale admin's forms, with error messages built as thunks so
 * they translate lazily at parse time rather than freezing into whatever locale was active when
 * the schema was created.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import {
    createLocaleBodyNameMax,
    createLocaleBodyNativeNameMax,
    createLocaleBodyTagMax,
    createLocaleBodyTagRegExp
} from '@api/schemas';
import { LocaleDirection } from '@api';

/**
 * Validation schemas for the locale admin's two forms.
 *
 * Messages are thunks resolved at parse time — see {@link translate} for why. It matters more here
 * than anywhere else in the app: this is the screen where a visitor changes the language, and
 * error text built as a plain string would stay in the old one while the labels around it moved.
 */

/**
 * Validation schema of the language form.
 *
 * `tag` is validated here for the CREATE case. Editing shows it disabled — it is what every entry
 * references, so the API keeps it immutable — and the dialog swaps this schema for
 * {@link localesLanguageEditSchema} rather than making the field conditionally optional, which
 * would leave a required field silently unchecked on the form that does write it.
 *
 * `tag` is the contract's own pattern and bound (a primary subtag then any BCP 47 subtags, 35
 * characters), not a narrower copy: a hand-written pattern refused `zh-Hans` and `en-GB-oed`,
 * which the API stores.
 *
 * `direction` and `active` are DEFAULTED, not required: `CreateLocaleRequest` requires only
 * `[tag, name, nativeName]` and infers the other two. `.default()` rather than `.optional()` so a
 * missing value resolves to the contract's own fallback instead of reaching the API as `undefined`.
 * `active` is the initial state only; an existing language moves through its activate and
 * deactivate buttons.
 */
export const localesLanguageSchema = z.object({
    tag: z
        .string()
        .min(1, { error: () => translate('locale-form.tag-required') })
        .max(createLocaleBodyTagMax, { error: () => translate('locale-form.tag-invalid') })
        .regex(createLocaleBodyTagRegExp, { error: () => translate('locale-form.tag-invalid') }),
    name: z
        .string()
        .min(1, { error: () => translate('locale-form.name-required') })
        .max(createLocaleBodyNameMax, { error: () => translate('locale-form.name-too-long') }),
    nativeName: z
        .string()
        .min(1, { error: () => translate('locale-form.native-name-required') })
        .max(createLocaleBodyNativeNameMax, {
            error: () => translate('locale-form.native-name-too-long')
        }),
    direction: z.enum(LocaleDirection).default(LocaleDirection.ltr),
    active: z.boolean().default(true)
});

/**
 * The same form on edit, where the tag is shown but not writable.
 *
 * `tag` accepts anything: `UpdateLocaleRequest` has no `tag` property at all, and the field is
 * disabled, so nothing typed here can reach the API.
 *
 * `name` and `nativeName` stay required. `UpdateLocaleRequest` lists no required fields — but that
 * describes OMISSION, and this form omits nothing: every field is sent on every save. A field that
 * is sent still has to satisfy `minLength: 1`, so relaxing them here would only move the rejection
 * from the form to a 422.
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
    app: z.string().min(1, { error: () => translate('entry-form.app-required') }),
    key: z.string().min(1, { error: () => translate('entry-form.key-required') }),
    value: z.string().min(1, { error: () => translate('entry-form.value-required') })
});
