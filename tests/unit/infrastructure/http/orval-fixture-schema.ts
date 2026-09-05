/**
 * @module
 * Runs a hand-typed `orvalMutator` mock fixture through the SAME schema lookup production uses
 * (`resolveResponseSchema`), so a spec's canned response is proven to match the real contract
 * instead of only satisfying whatever shape the test author typed by hand.
 *
 * A spec that mocks `orvalMutator` directly bypasses `orvalMutator`'s own validation entirely — a
 * fixture that drifts from the generated contract can pass a test forever with nothing to catch
 * it. Parsing the fixture through this before it resolves closes that gap without touching the
 * mock's dispatch logic.
 */
import { resolveResponseSchema } from '@/infrastructure/http/response-schema-map';

/**
 * Wraps a payload in the API's success envelope — `{ success, status, message, data }` — every
 * response schema in `contracts/rest/schemas.zod.ts` actually requires. A spec's hand-typed
 * fixture is usually just the `data` a store reads; this is what turns it into something
 * `parseOrvalFixture` can validate for real, without every spec repeating the boilerplate.
 *
 * Omits `data` entirely rather than setting it to `undefined` for a bodyless response — the
 * schemas are `zod.strictObject`, which rejects a key it does not declare regardless of the
 * value behind it.
 *
 * @param data - the payload a store reads off `data`; omit for a response with no body
 * @param status - the envelope's HTTP status, defaults to 200
 * @returns the full envelope a mocked `orvalMutator` should resolve with
 */
export const orvalEnvelope = (data?: unknown, status = 200): Record<string, unknown> =>
    data === undefined
        ? { success: true, status, message: 'OK' }
        : { success: true, status, message: 'OK', data };

/**
 * Validates a mocked `orvalMutator` response against its real contract schema before a test's
 * mock resolves it.
 *
 * Mirrors `resolveResponseSchema`'s own "not fatal, just unmapped" rule: a route absent from the
 * table passes `data` through unchanged rather than failing the fixture for a maintenance gap
 * that says nothing about whether the response itself is right.
 *
 * Uses `safeParse` and always returns the ORIGINAL `data`, never Zod's parsed result — mirroring
 * `validateResponseAgainstContract` (`src/infrastructure/http/validate.ts`), which validates a
 * real response and discards the parse, rather than `schema.parse`, which fills in every
 * `.default()` field the schema declares. A fixture that omits an optional field with a default
 * (`Product.requiresShipping`, say) must resolve with exactly what the test wrote, the same as a
 * real backend response that omits it — not with a value defaulted in by this helper and by
 * nothing the app itself does.
 *
 * @param method - the mocked request's HTTP method, as read off the intercepted config
 * @param url - the mocked request's URL, as read off the intercepted config
 * @param data - the fixture a spec wants the mock to resolve with
 * @returns `data`, unchanged, once it has been proven against its contract schema
 * @throws {import('zod').ZodError} When `data` does not match the resolved schema
 */
export const parseOrvalFixture = (
    method: string | undefined,
    url: string | undefined,
    data: unknown
): unknown => {
    const schema = resolveResponseSchema(method, url);
    if (!schema) return data;

    const result = schema.safeParse(data);
    if (!result.success) throw result.error;
    return data;
};
