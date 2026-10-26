/**
 * @module
 * Turns the entity-translations editor's drafts into the PATCH body the API merges.
 */
import { TranslationOrigin } from '@/types/enums.ts';
import type { UpdateEntityTranslationsRequest } from '@types';

/**
 * The editor's draft shape: one entry per open locale, an object of field values to save, or
 * `null` for a tab marked for removal.
 */
export type TranslationDrafts = Record<string, Record<string, string> | null>;

/**
 * Builds the merge-patch body for a save.
 *
 * A blank field goes out as `null`, which the API reads as "clear it": dropping it instead
 * would keep the stored value, so a cleared description would silently come back.
 *
 * @param drafts - Every open locale's field values, or `null` for a removed one.
 * @returns A body for `PATCH /locales/translations/{entityType}/{id}`.
 */
export const toUpdateEntityTranslationsBody = (
    drafts: TranslationDrafts
): UpdateEntityTranslationsRequest =>
    Object.fromEntries(
        Object.entries(drafts).map(([tag, fields]) => [
            tag,
            fields === null
                ? null
                : {
                      fields: Object.fromEntries(
                          Object.entries(fields).map(([name, value]) => [
                              name,
                              value === '' ? null : value
                          ])
                      ),
                      origin: TranslationOrigin.human
                  }
        ])
    );
