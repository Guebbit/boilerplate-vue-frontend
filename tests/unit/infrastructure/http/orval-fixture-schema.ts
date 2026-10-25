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
import type { ZodType } from 'zod';
import { resolveResponseSchema } from '@/infrastructure/http/response-schema-map';

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

/**
 * The same proof for a spec that mocks a generated `@api` function rather than `orvalMutator`:
 * there is no URL to look a schema up by, so the caller names the operation's own
 * `<Operation>Response` schema from `@api/schemas` instead.
 *
 * Returns the body unparsed, for the same reason {@link parseOrvalFixture} does — a `.default()`
 * the schema would fill in is not something the real backend sent.
 *
 * @param schema - the operation's response schema, e.g. `schemas.GetCartResponse`
 * @param data - the body a store reads; omit for a response with no body
 * @returns the body, once it has been proven against `schema`
 * @throws {import('zod').ZodError} When the body does not match `schema`
 */
export const contractResponse = (schema: ZodType, data?: unknown): unknown => {
    const result = schema.safeParse(data);
    if (!result.success) throw result.error;
    return data;
};

/**
 * {@link contractResponse}, typed as the generated client's answer it stands in for, so a spec
 * can hand it straight to a mocked client function.
 *
 * @typeParam TBody - the generated client's answer type, e.g. `Answer<typeof getCart>`
 * @param schema - the operation's response schema
 * @param data - the body a store reads
 * @returns the body, once proven against `schema`
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the parameter is the caller's claim about which generated answer the proven fixture stands in for
export const contractBody = <TBody>(schema: ZodType, data?: unknown): TBody =>
    // Proven against the operation's schema by `contractResponse`, so it is the body the caller names.
    contractResponse(schema, data) as TBody;

/**
 * The request-body half of the same proof — a spec asserting on what `orvalMutator` was
 * CALLED WITH (`lastPatchBody()`-style helpers reading `config.data` off a mock's call list)
 * proves the app built the shape the test author expected, never that the shape is one the real
 * endpoint accepts. A spec that quietly drifts from the contract's own request schema — a
 * `zod.strictObject` refusing a stray key, a `minLength: 1` refusing `''` — passes here forever
 * with nothing to catch it, the same gap {@link parseOrvalFixture} closes for responses.
 *
 * No route table: unlike a response, a request body's operation is exactly the one the spec is
 * already testing, so the caller just names that operation's own `<Operation>Body` schema from
 * `@api/schemas` — mirroring {@link contractResponse}'s same choice, for the same reason.
 *
 *  * @param schema - the operation's request-body schema, e.g. `schemas.UpdateUserByIdBody`
 * @param data - the body a call under test actually sent
 * @returns `data`, unchanged, once it has been proven against `schema`
 * @throws {import('zod').ZodError} When `data` does not match `schema`
 */
export const contractRequest = (schema: ZodType, data: unknown): unknown => {
    const result = schema.safeParse(data);
    if (!result.success) throw result.error;
    return data;
};
