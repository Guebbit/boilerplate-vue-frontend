/**
 * @module
 * Zod validation schemas for the example forms, with i18n-thunked error messages resolved at parse
 * time rather than at schema-definition time. Bounds come from the generated contract schemas,
 * never restated here.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { createExampleBodyBodyMax, createExampleBodyTitleMax } from '@api/schemas';
import { EXAMPLE_STATUSES } from '@/modules/example/domain';

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
 * Creating an example: a title and a body. A new example is always a draft.
 */
export const exampleCreateSchema = z.object({
    title: exampleTitleSchema,
    body: exampleBodySchema
});

/**
 * Editing an example: the create fields plus the status.
 */
export const exampleEditSchema = exampleCreateSchema.extend({
    status: z.enum(EXAMPLE_STATUSES)
});
