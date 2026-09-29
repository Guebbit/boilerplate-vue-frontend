/**
 * @module
 * The form-to-wire boundary. On the wire `null` clears an optional field (RFC 7396), an omitted
 * field leaves it alone, and `''` is legal only where the schema says so. A text input knows
 * none of that, so {@link toRequestBody} translates once, here: the loaded record decides what
 * changed, the generated schema decides how empty is spelled. `validateRequestAgainstContract`
 * is the twin that says when a call site skipped it.
 */
import { isEqual, isPlainObject } from 'lodash-es';
import type { z, ZodType } from 'zod';

/**
 * Any generated JSON request-body schema — a name ending in `Body` in `@api/schemas`.
 */
export type BodySchemaName = {
    [K in keyof BodySchemas]: K extends `${string}Body` ? K : never;
}[keyof BodySchemas];

/**
 * The generated schemas namespace, type only — a value import would pull the ~350 KB contract
 * chunk into every entry bundle (see `response-schema-map.ts`).
 */
type BodySchemas = typeof import('@api/schemas');

/**
 * Whether a form value says nothing: the three shapes an untouched or emptied field takes.
 *
 * @param value - Any form or record value.
 */
const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '';

/**
 * Strips `Optional`/`Nullable` wrappers so the underlying object or record schema is reachable.
 *
 * Reads Zod's public `.type` discriminator and `.unwrap()` rather than `instanceof`: a value
 * import of `zod` here would drag the library into the entry chunk (it has a byte budget).
 *
 * @param field - A field schema, possibly wrapped by `.optional()`/`.nullable()`/`.nullish()`.
 * @returns The innermost schema.
 */
const unwrapField = (field: ZodType): ZodType =>
    // Single cast: `.unwrap` exists exactly on the two wrapper types this branch tests for.
    'unwrap' in field && (field.type === 'optional' || field.type === 'nullable')
        ? unwrapField((field as z.ZodOptional).unwrap() as ZodType)
        : field;

/**
 * The schema of one child of an object or record schema, or `undefined` when the schema does not
 * describe children (a scalar, an array) or does not know the key.
 *
 * @param node - The parent field schema, or `undefined` when unknown.
 * @param key - The child key.
 */
const childSchema = (node: ZodType | undefined, key: string): ZodType | undefined => {
    const parent = node && unwrapField(node);
    // Single casts: the `.type` test proves which of the two shapes this is.
    if (parent?.type === 'object') return (parent as z.ZodObject).shape[key] as ZodType | undefined;
    if (parent?.type === 'record') return (parent as z.ZodRecord).valueType as ZodType;
    return undefined;
};

/**
 * How a field's empty is spelled in THIS body, by asking the schema — the one validator that
 * decides. `''` stays where the field accepts it, becomes `null` where `null` is the clear, and
 * is left off where neither is legal (a create has nothing to clear).
 *
 * https://zod.dev/api#safeparse — `safeParse` returns `{ success }` and never throws.
 *
 * @param field - The field's schema; `undefined` for a key the schema does not know.
 * @param raw - The emptied value the form holds.
 * @returns The wire spelling, or `undefined` to omit the key.
 */
const spellEmpty = (field: ZodType | undefined, raw: '' | null): string | null | undefined => {
    if (!field) return raw;
    if (raw === '' && field.safeParse('').success) return '';
    return field.safeParse(null).success ? null : undefined;
};

/**
 * Shapes one field. Recurses into a plain object against its child schemas; everything else
 * (arrays, files, numbers, non-empty strings) passes through unchanged.
 *
 * @param field - The field's schema, when known.
 * @param value - The form's value.
 * @param base - The loaded record's value for the same field.
 * @returns The wire value, or `undefined` to omit the key.
 */
const shapeField = (field: ZodType | undefined, value: unknown, base: unknown): unknown => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return spellEmpty(field, value);
    if (!isPlainObject(value)) return value;
    const shaped = shapeObject(
        field,
        value as Record<string, unknown>,
        isPlainObject(base) ? (base as Record<string, unknown>) : undefined
    );
    // An unchanged nested object has nothing to say; without a baseline `{}` is a real value.
    return Object.keys(shaped).length === 0 && isPlainObject(base) ? undefined : shaped;
};

/**
 * Shapes every key of one object level: diff against the baseline, then spell what is left.
 *
 * @param node - The object (or record) schema for this level, when known.
 * @param form - The form's values.
 * @param baseline - The loaded record for this level; absent on a create or a PUT.
 */
const shapeObject = (
    node: ZodType | undefined,
    form: Record<string, unknown>,
    baseline: Record<string, unknown> | undefined
): Record<string, unknown> =>
    Object.fromEntries(
        Object.entries(form)
            .filter(([key, value]) => !baseline || !unchanged(value, baseline[key]))
            .map(
                ([key, value]) =>
                    [key, shapeField(childSchema(node, key), value, baseline?.[key])] as const
            )
            .filter(([, value]) => value !== undefined)
    );

/**
 * Whether a form value equals the loaded one. Empty is one value for the comparison, so an
 * untouched `''` against a record that never had the field reads as unchanged.
 *
 * @param value - The form's value.
 * @param base - The loaded record's value.
 */
const unchanged = (value: unknown, base: unknown): boolean =>
    (isEmpty(value) && isEmpty(base)) || isEqual(value, base);

/**
 * Builds a request body from form state — the ONE place a form's `''` becomes the wire's spelling.
 *
 * Two answers, from two places:
 * - did the field change? — `baseline` (the loaded record). No baseline (a create, a PUT) sends
 *   everything the form holds; with one, every unchanged field is omitted.
 * - how is empty spelled here? — `schema`, probed through `safeParse` (see {@link spellEmpty}).
 *
 * Validates nothing and never throws: `validateRequestAgainstContract` says when a body is wrong.
 *
 * @param schema - The operation's generated request-body schema.
 * @param form - The form's current values. A key the schema does not know (an upload) passes through.
 * @param baseline - The loaded record to diff against, on a PATCH.
 * @returns The body. Typing it as the operation's request type is {@link toRequestBody}'s job.
 */
export const shapeBody = (
    schema: ZodType,
    form: object,
    baseline?: object
): Record<string, unknown> =>
    // Single casts: any object is a string-keyed record once its entries are read.
    shapeObject(
        schema,
        form as Record<string, unknown>,
        baseline as Record<string, unknown> | undefined
    );

/**
 * {@link shapeBody} for a generated body schema named by its export, loaded on demand: the
 * contract chunk stays out of the entry bundle, and every submit handler is async already.
 *
 * @param name - The `@api/schemas` export, e.g. `'UpdateAccountBody'`.
 * @param form - The form's current values.
 * @param baseline - The loaded record to diff against, on a PATCH.
 * @returns The body, typed by that schema's input.
 */
export const toRequestBody = <TName extends BodySchemaName>(
    name: TName,
    form: object,
    baseline?: object
): Promise<z.input<BodySchemas[TName]>> =>
    import('@api/schemas').then(
        (schemas) =>
            // The one narrowing the compiler cannot see: the schema probe is what guarantees each
            // key is spelled the way this schema's input type allows.
            shapeBody(schemas[name] as ZodType, form, baseline) as z.input<BodySchemas[TName]>
    );

/**
 * A body with its `null` (clear) entries taken out — the shape a multipart request can carry.
 */
export type WithoutClears<T> = { [K in keyof T]: Exclude<T[K], null> };

/**
 * Only the entries of a body that clear a field.
 */
export type OnlyClears<T> = { [K in keyof T as null extends T[K] ? K : never]?: null };

/**
 * Sends a save that may carry an upload AND clears. A multipart part is a string or a file, never
 * `null`, so the clears travel apart as a JSON PATCH after the upload — the contract's
 * `*RequestMultipart` twins are `null`-free, and the compiler refuses the un-split call.
 *
 * Not atomic, and only when it has to be: the second request fires only if a `null` is present.
 * If it fails the caller sees the rejection and the form stays dirty, so nothing is silently lost.
 *
 * @param body - The write body, `null`s included.
 * @param sendUpload - Sends the multipart request with everything non-null.
 * @param sendClears - Sends the JSON PATCH carrying only the clears.
 * @returns The last response sent — the clears' one when there were any, since it is the newer.
 */
export const uploadThenClear = <T extends object, TResult>(
    body: T,
    sendUpload: (rest: WithoutClears<T>) => Promise<TResult>,
    sendClears: (clears: OnlyClears<T>) => Promise<TResult>
): Promise<TResult> => {
    const entries = Object.entries(body);
    // Narrowing casts below: `Object.fromEntries` is `{ [k: string]: V }`, the mapped types are what
    // the caller's request types are checked against.
    const clears = Object.fromEntries(
        entries.filter(([, value]) => value === null)
    ) as OnlyClears<T>;
    const rest = Object.fromEntries(
        entries.filter(([, value]) => value !== null)
    ) as WithoutClears<T>;
    return sendUpload(rest).then((result) =>
        Object.keys(clears).length > 0 ? sendClears(clears) : result
    );
};

/**
 * Keeps only `keys` whose value in `patch` is non-null — the "leave the optimistic guess alone"
 * rule for a field that accepts `null` on the wire (clears it) but whose LOCAL, cached shape
 * never holds `null`, only a real value or absence.
 *
 * @param patch - The object carrying the candidate fields, alongside others this ignores.
 * @param keys - Which of `patch`'s own keys are subject to the rule.
 * @returns A fresh object with only the non-null entries among `keys`.
 */
export const omitNulls = <T extends object, TKey extends keyof T>(
    patch: T,
    keys: readonly TKey[]
): Partial<{ [P in TKey]: NonNullable<T[P]> }> =>
    Object.fromEntries(
        keys.filter((key) => patch[key] != null).map((key) => [key, patch[key]])
    ) as Partial<{ [P in TKey]: NonNullable<T[P]> }>;
