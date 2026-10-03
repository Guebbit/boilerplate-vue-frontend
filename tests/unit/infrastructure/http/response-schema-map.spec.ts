/**
 * Route → response-schema lookup — `src/infrastructure/http/response-schema-map.ts`.
 *
 * This table is what lets `orvalMutator` validate a live response without being told which
 * operation it is serving. Two properties in it are load-bearing and easy to break silently:
 *
 *   **Anchoring.** Every pattern is anchored at both ends specifically so a `[^/]+` segment
 *   cannot absorb an adjacent literal one. Drop the `$` from `^/orders/[^/]+` and it starts
 *   matching `/orders/abc/invoice`, so an invoice response gets validated against the
 *   *order* schema — which fails, loudly, on a perfectly valid response.
 *
 *   **Order.** `find()` returns the first match, so a literal sibling (`/products/categories`)
 *   must be listed before a same-depth `{param}` one (`/products/{id}`) that would otherwise
 *   absorb it. Generated (`scripts/contracts/generate-route-table.ts`), sorted by
 *   ascending param count — this file no longer has to re-prove that ordering by hand, only that
 *   `resolveResponseSchema` still respects whatever order it is given.
 *
 * Neither is visible in a code review of the table itself, which is what these tests are for.
 * The existing `http-validate-responses.spec.ts` covers the mutator's *behaviour*; this covers the
 * lookup it depends on.
 */

import { asStub } from '../../../support/stub';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    loadResponseSchemas,
    resolveRequestSchema,
    resolveResponseSchema
} from '@/infrastructure/http/response-schema-map';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';
import { ROUTES as GENERATED_ROUTES } from '@api/routes';
import { collectModuleResponseSchemas } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import * as schemas from '@api/schemas';

/*
 * Wire the modules in exactly as `src/main.ts` does.
 *
 * Most rows now live in `src/modules/<name>/response-schemas.ts` rather than in one central table,
 * so without this the lookup would answer `undefined` for every domain endpoint and this whole
 * file would pass by testing nothing. Assembling the real registry also means the openapi parity
 * check below now proves something stronger than it used to: that the enabled modules between them
 * still cover every documented operation.
 *
 * Awaited: the rows load lazily now, same as the real app does after first paint —
 * `beforeAll` returning the promise is what makes every test below see them already installed.
 */
beforeAll(() => loadResponseSchemas(collectModuleResponseSchemas(enabledModules)));

/**
 * Looks a generated response schema up by its export name. Keeping the table string-only matters
 * beyond tidiness: Zod schemas are deep recursive objects, and letting `it.each` serialise one
 * into a test title exhausts the worker's heap.
 */
const schemaByName = (name: string) => asStub<Record<string, unknown>>(schemas)[name];

/** A representative ObjectId, for the parameterised routes. */
const ID = '65dc8a99604c307b702b5ccc';

/**
 * `contracts/rest/index.ts`'s own function name for one response schema's operation
 * — the inverse of `generate-route-table.ts`'s `schemaNameFor`. Not exact for the seven
 * operations orval splits on content type (`generate-operation-modules.ts`'s
 * `contentTypeOperationNames`): {@link isImportedByApp} checks both spellings for those.
 */
const operationIdFromSchemaName = (schemaName: string): string => {
    const bare = schemaName.slice(0, -'Response'.length);
    return `${bare.charAt(0).toLowerCase()}${bare.slice(1)}`;
};

/** Every `.ts`/`.vue` file below `directory`, recursively, specs excluded. */
const listSourceFiles = (directory: string): string[] =>
    readdirSync(directory).flatMap((entry) => {
        const entryPath = path.join(directory, entry);
        if (statSync(entryPath).isDirectory()) return listSourceFiles(entryPath);
        if (entryPath.includes(`${path.sep}tests${path.sep}`)) return [];
        return /\.(ts|vue)$/.test(entryPath) ? [entryPath] : [];
    });

/** The names in one `{ … }` import clause, `type` prefixes and `as` aliases dropped. */
const importClauseNames = (clause: string): string[] =>
    clause
        .split(',')
        .map((name) => name.trim().replace(/^type\s+/, ''))
        .filter(Boolean)
        .map((name) => name.split(/\s+as\s+/)[0].trim());

/**
 * Every name `src/` imports from `@api` anywhere — the generated REST client's function barrel —
 * specs excluded (a spec exercising the contract directly is not a real call site). Mirrors
 * `tests/cross-cutting/module-coupling.spec.ts`'s own scan of the same import shape.
 */
const importedApiFunctionNames = (): Set<string> => {
    const names = new Set<string>();
    for (const file of listSourceFiles(path.resolve(process.cwd(), 'src')))
        for (const match of readFileSync(file, 'utf8').matchAll(
            /import\s+(?:type\s+)?{([^}]*)}\s+from\s+["']@api["']/g
        ))
            for (const name of importClauseNames(match[1])) names.add(name);
    return names;
};

/** Every `@api` function the app's source imports. */
const IMPORTED_API_FUNCTION_NAMES = importedApiFunctionNames();

/**
 * Whether the app actually calls this schema's own operation anywhere, under either spelling a
 * content-type split might have given it.
 */
const isImportedByApp = (schemaName: string): boolean => {
    const operationId = operationIdFromSchemaName(schemaName);
    return (
        IMPORTED_API_FUNCTION_NAMES.has(operationId) ||
        IMPORTED_API_FUNCTION_NAMES.has(`${operationId}WithMultipart`)
    );
};

/** Every `method`+`pattern` this generated table declares, without its two duplicates. */
const ROUTE_KEYS = GENERATED_ROUTES.map((route) => `${route.method} ${route.pattern.source}`);

/**
 * Every operation `openapi.yaml` declares, as `[method, path, schemaName]` with the spec's
 * `{param}` placeholders substituted for the same representative `ID` — generated from the spec
 * not hand-copied, so it cannot drift from the table under test the way a hand-typed
 * mirror already had.
 *
 * No "not called by this client" exclusion list any more: {@link routesForModules} claims a row
 * for every operation its `x-module` names, whether or not any frontend code calls it yet (the
 * payment provider's own webhook callback included) — coverage below is complete BY
 * CONSTRUCTION, not by a hand-kept exception list staying in sync with reality.
 */
const SPEC_OPERATIONS: [method: string, path: string, name: string][] = (() => {
    // `process.cwd()` is the project root under vitest; `import.meta.url` is not a file URL once
    // the suite has been through the jsdom transform.
    const spec = parse(readFileSync(path.resolve(process.cwd(), 'openapi.yaml'), 'utf8')) as {
        paths: Record<string, Record<string, { operationId?: string }>>;
    };
    const methods = new Set(['get', 'post', 'put', 'delete', 'patch']);

    return Object.entries(spec.paths).flatMap(([specPath, item]) =>
        Object.entries(item)
            .filter(
                (entry): entry is [string, { operationId: string }] =>
                    methods.has(entry[0]) && typeof entry[1].operationId === 'string'
            )
            .map(([method, operation]): [string, string, string] => [
                method.toUpperCase(),
                // `{id}`, `{productId}`, `{locale}` — the map matches a SEGMENT, not a name.
                specPath.replaceAll(/{[^}]+}/g, ID),
                `${operation.operationId.charAt(0).toUpperCase()}${operation.operationId.slice(1)}Response`
            ])
    );
})();

describe('routeSchemas table', () => {
    it('covers every operation declared in openapi.yaml', () => {
        const unmapped = SPEC_OPERATIONS.filter(
            ([method, path]) => !resolveResponseSchema(method, path)
        );

        // Named, not counted: the failure message is the list of operations whose responses go
        // unvalidated, which is the thing someone has to act on.
        expect(unmapped).toEqual([]);
    });

    it('names a real request-body schema for every operation that declares a JSON body', () => {
        const missing = GENERATED_ROUTES.flatMap((route) =>
            route.bodySchemaName !== undefined &&
            !(schemas as Record<string, unknown>)[route.bodySchemaName]
                ? [`${route.method} ${route.pattern.source} -> ${route.bodySchemaName}`]
                : []
        );

        expect(missing).toEqual([]);
        // A canary: the check above is vacuous if the generator ever stops naming any.
        expect(
            GENERATED_ROUTES.filter((route) => route.bodySchemaName !== undefined).length
        ).toBeGreaterThan(50);
    });

    it('resolves the request schema of a write from the same row as its response', () => {
        expect(resolveRequestSchema('PATCH', '/account')).toBe(schemas.UpdateAccountBody);
        expect(resolveRequestSchema('GET', '/account')).toBeUndefined();
    });

    it('has no two generated rows for the same method and pattern', () => {
        // The regression this generator exists to prevent: the 7 webhooks rows used to be
        // registered TWICE, once on the core shelf and once in `webhooks/response-schemas.ts` —
        // `find()` silently returned whichever was listed first, and nothing caught the other
        // becoming dead weight.
        expect(new Set(ROUTE_KEYS).size).toBe(ROUTE_KEYS.length);
    });

    it.each(SPEC_OPERATIONS)('%s %s resolves to %s', (method, path, name) => {
        expect(resolveResponseSchema(method, path)).toBe(schemaByName(name));
    });

    /**
     * Both anchors carry weight, and neither is visible in review.
     *
     * Without the trailing `$`, a pattern absorbs deeper paths — `^\/orders\/[^/]+` would claim
     * `/orders/:id/invoice`, validating an invoice against the order schema.
     *
     * Without the leading `^`, it matches anywhere in the string — `\/products$` would claim
     * `/admin/products`.
     *
     * Asserting one representative route per anchor would leave the other fifty unguarded, so
     * both are asserted for every row.
     */
    it.each(SPEC_OPERATIONS)('%s %s does not also claim a deeper path', (method, path, name) => {
        expect(resolveResponseSchema(method, `${path}/deeper`)).not.toBe(schemaByName(name));
    });

    it.each(SPEC_OPERATIONS)('%s %s does not also claim a prefixed path', (method, path, name) => {
        expect(resolveResponseSchema(method, `/prefixed${path}`)).not.toBe(schemaByName(name));
    });

    /**
     * `[^/]+` — one or more. A `*` would match an *empty* segment, so `/users/` (a trailing
     * slash, which browsers and proxies produce readily) would resolve to the by-id schema and
     * validate a 404 body against it.
     */
    it.each(SPEC_OPERATIONS.filter(([, path]) => path.includes(ID)))(
        '%s %s requires a non-empty id segment',
        (method, path, name) => {
            expect(resolveResponseSchema(method, path.replace(ID, ''))).not.toBe(
                schemaByName(name)
            );
        }
    );
});

/**
 * The narrower parity claim: not "every declared operation has a row" (true unconditionally
 * above, by construction) but "every operation the app actually CALLS resolves correctly" — a
 * second, independent signal computed straight from `src/`'s own imports, so a real call site
 * missing its validation fails here even in the (today, hypothetical) case a module's ownership
 * list ever fell out of step with the contract.
 */
describe('operations this app actually imports', () => {
    it('finds a real, partial subset — not every declared operation, and not none', () => {
        // A canary: an empty set would make every assertion below vacuous; a full set would mean
        // the import scan silently matched everything, not just real call sites.
        const importedCount = SPEC_OPERATIONS.filter((operation) =>
            isImportedByApp(operation[2])
        ).length;

        expect(importedCount).toBeGreaterThan(0);
        expect(importedCount).toBeLessThan(SPEC_OPERATIONS.length);
    });

    it('resolves correctly for every operation actually imported', () => {
        const unresolved = SPEC_OPERATIONS.filter(
            ([method, path, name]) =>
                isImportedByApp(name) && resolveResponseSchema(method, path) !== schemaByName(name)
        );

        expect(unresolved.map(([method, path]) => `${method} ${path}`)).toEqual([]);
    });
});

/*
 * Rows invented for the mechanism tests below.
 *
 * `resolveResponseSchema` is a matcher: method equality, anchored patterns, first match wins. None
 * of that is about which domains exist, and pinning it to `/products` would break a core spec on
 * the day the products module is deleted — the coupling `docs/theory/modules.md` describes.
 *
 * `/widgets` belongs to nobody and expresses every property, including the two traps the anchors
 * exist for: a literal sub-route (`/widgets/:id/detail`) that a `[^/]+` pattern would swallow, and
 * four methods sharing one path. The schema VALUES are arbitrary real ones — only their identity
 * is asserted, never their contents.
 */
const widgetRows: ResponseSchemaRoute[] = [
    { method: 'GET', pattern: /^\/widgets$/, schema: schemas.GetHealthResponse },
    { method: 'POST', pattern: /^\/widgets$/, schema: schemas.GetLocalesResponse },
    { method: 'PUT', pattern: /^\/widgets$/, schema: schemas.ListFeedbackRequestsResponse },
    { method: 'DELETE', pattern: /^\/widgets$/, schema: schemas.CreateFeedbackRequestResponse },
    {
        method: 'GET',
        pattern: /^\/widgets\/[^/]+\/detail$/,
        schema: schemas.GetLocaleDictionaryResponse
    },
    {
        method: 'GET',
        pattern: /^\/widgets\/[^/]+$/,
        schema: schemas.UpdateFeedbackRequestStatusResponse
    }
];

describe('resolveResponseSchema', () => {
    // Replaces the module rows for this block only; the parity table above re-registers the real
    // ones for itself. Through `loadResponseSchemas`, not `registerResponseSchemas` directly, so
    // the real core rows are still resolved and merged in — exactly what "keeps the core rows"
    // below checks.
    beforeEach(() => loadResponseSchemas([() => Promise.resolve(widgetRows)]));

    it('resolves a simple collection route', () => {
        expect(resolveResponseSchema('GET', '/widgets')).toBe(schemas.GetHealthResponse);
    });

    it('distinguishes methods on the same path', () => {
        // Four operations share `/widgets`; picking the wrong one would validate a creation
        // response against the list schema.
        expect(resolveResponseSchema('GET', '/widgets')).toBe(schemas.GetHealthResponse);
        expect(resolveResponseSchema('POST', '/widgets')).toBe(schemas.GetLocalesResponse);
        expect(resolveResponseSchema('PUT', '/widgets')).toBe(schemas.ListFeedbackRequestsResponse);
        expect(resolveResponseSchema('DELETE', '/widgets')).toBe(
            schemas.CreateFeedbackRequestResponse
        );
    });

    it('resolves a parameterised route', () => {
        expect(resolveResponseSchema('GET', `/widgets/${ID}`)).toBe(
            schemas.UpdateFeedbackRequestStatusResponse
        );
    });

    it('accepts a lowercase method', () => {
        // Axios does not normalise `config.method`; it is commonly lowercase.
        expect(resolveResponseSchema('get', '/widgets')).toBe(schemas.GetHealthResponse);
    });

    it('defaults to GET when no method is given', () => {
        expect(resolveResponseSchema(undefined, '/widgets')).toBe(schemas.GetHealthResponse);
    });

    it('keeps a nested literal segment distinct from an id segment', () => {
        // The anchoring property, stated as behaviour: `/widgets/:id/detail` and `/widgets/:id`
        // are different operations with different response shapes.
        const detail = resolveResponseSchema('GET', `/widgets/${ID}/detail`);
        const widget = resolveResponseSchema('GET', `/widgets/${ID}`);

        expect(detail).toBe(schemas.GetLocaleDictionaryResponse);
        expect(widget).toBe(schemas.UpdateFeedbackRequestStatusResponse);
        expect(detail).not.toBe(widget);
    });

    it('resolves the health route from the root path', () => {
        // A core row, always present whichever modules are enabled.
        expect(resolveResponseSchema('GET', '/')).toBe(schemas.GetHealthResponse);
    });

    it('does not let the root pattern match every path', () => {
        // `^\/$` — if the `$` were dropped, `/` would match everything and every response in the
        // app would be validated against the health schema.
        expect(resolveResponseSchema('GET', '/widgets')).not.toBe(schemas.GetLocalesResponse);
    });

    it('returns undefined for a route absent from the table', () => {
        // Fail-open by design: a missing entry is a maintenance gap, not proof the response is
        // wrong, so the caller warns instead of throwing.
        expect(resolveResponseSchema('GET', '/not-a-real-route')).toBeUndefined();
    });

    it('returns undefined when the path matches but the method does not', () => {
        expect(resolveResponseSchema('PATCH', '/widgets')).toBeUndefined();
    });

    it('ignores the query string when resolving', () => {
        expect(resolveResponseSchema('GET', '/widgets?page=2')).toBe(schemas.GetHealthResponse);
    });

    it('resolves through an absolute url', () => {
        expect(resolveResponseSchema('GET', 'https://api.example.com/widgets')).toBe(
            schemas.GetHealthResponse
        );
    });

    it('keeps the core rows regardless of what the modules register', () => {
        // `loadResponseSchemas` always resolves the real core rows alongside whatever module
        // loaders it is given. `/locales` is core's, so it must still resolve even though only
        // `/widgets` was just registered above.
        expect(resolveResponseSchema('GET', '/locales')).toBe(schemas.GetLocalesResponse);
    });
});
