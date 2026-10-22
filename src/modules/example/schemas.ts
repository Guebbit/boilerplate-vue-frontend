/**
 * @module
 * Zod validation schema for the example form, with i18n-thunked error messages resolved at parse
 * time rather than at schema-definition time. Bounds come from the generated contract schemas,
 * never restated here.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { createExampleBodyBodyMax, createExampleBodyTitleMax } from '@api/schemas';

/**
 * A title: required, and no longer than the contract allows.
 */
const exampleTitleSchema = z
    .string()
    .min(1, { error: () => translate('example-form.title-required') })
    .max(createExampleBodyTitleMax, { error: () => translate('example-form.title-too-long') });

/**
 * A body: required, and no longer than the contract allows. A deployment may set a lower ceiling,
 * which only the server knows; its 422 reaches the field through `applyServerErrors`.
 */
const exampleBodySchema = z
    .string()
    .min(1, { error: () => translate('example-form.body-required') })
    .max(createExampleBodyBodyMax, { error: () => translate('example-form.body-too-long') });

/**
 * Creating or editing an example: a title and a body. A new example is always a draft, and the
 * status moves through its own door, so the one form has no status field.
 */
export const exampleFormSchema = z.object({
    title: exampleTitleSchema,
    body: exampleBodySchema
});
