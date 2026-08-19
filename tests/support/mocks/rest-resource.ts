/**
 * The mock API's CRUD engine — one implementation of the contract's standard resource shape.
 *
 * Products and users used to carry near-identical 300-line handler files: the same list
 * pipeline (visibility → filters → pagination → envelope), the same by-id lookup with the same
 * 404, the same root-vs-by-id update pair, the same soft-delete toggle with the same `/hard`
 * escape. That duplication was behaviour drift waiting to happen — a rule fixed in one file and
 * not the other.
 *
 * A module now DECLARES its resource: where the rows live, which filters its backend honours,
 * how a row is built from a request, what soft delete does to it. The engine owns everything the
 * contract standardises. What stays handwritten in a module's `handlers.ts` is only what is
 * genuinely that module's behaviour — facet counting, auth journals, checkout math.
 *
 * Every route registers ONLY when its schema is declared, so a resource without a `/search`
 * endpoint simply omits `schemas.search` — the engine never invents routes the contract lacks.
 * Every response passes through `toMockJsonResponse` with its schema, so the engine cannot drift
 * from `openapi.yaml` in shape any more than the handwritten handlers could.
 */
import { http, type HttpHandler } from 'msw';
import type { ZodType } from 'zod';
import {
    asText,
    createErrorEnvelope,
    createMessageResponse,
    createSuccessEnvelope,
    getQueryParameters,
    isCurrentMockUserAdmin,
    readHardDeleteFlag,
    readRequestBody,
    readRequestParts,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta
} from './mockDb.ts';
import { toMockJsonResponse } from './mockTransport.ts';
import { MockErrorResponse } from './mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** A parsed query string or search body: field names to whatever the caller sent. */
export type MockQuery = Record<string, unknown>;

/** A parsed request body's fields (multipart or JSON — `readRequestParts` handles both). */
export type MockFields = Record<string, unknown>;

/**
 * The schemas gating which routes exist. A missing key is a missing route, not a default:
 * the engine mirrors the contract, and the contract is what decides a resource's surface.
 */
export interface RestResourceSchemas {
    /** GET /base */
    list?: ZodType;
    /** POST /base/search — the body is read as extra query parameters, as the BE does. */
    search?: ZodType;
    /** POST /base */
    create?: ZodType;
    /** PUT /base — the id travels in the body. */
    update?: ZodType;
    /** DELETE /base — the id travels in the body; always a hard delete, as on the BE. */
    delete?: ZodType;
    /** GET /base/:id */
    get?: ZodType;
    /** PUT /base/:id */
    updateById?: ZodType;
    /** DELETE /base/:id — soft by default when `softDelete` is declared, `?hard=true` escapes. */
    deleteById?: ZodType;
    /** DELETE /base/:id/hard */
    hardDeleteById?: ZodType;
}

export interface RestResourceConfig<TRow extends { id: string }> {
    /** Path segment under the API base: 'products' → `${API_BASE}/products`. */
    base: string;
    /** Human label for envelope messages: 'Product not found', 'Product deleted'. */
    label: string;
    /** The live row array — a function, because reset/journal replay swap the arrays. */
    collection: () => TRow[];
    schemas: RestResourceSchemas;
    /**
     * Role-scoped visibility, applied before any caller filter — the same order as the BE, which
     * folds `active`/`deletedAt` into the `where` it builds filters on. When declared it also
     * guards GET /base/:id: a non-admin asking for a hidden row gets a 404, not a 403 — the
     * row's existence is not disclosed. Absent → every caller sees every row.
     */
    visibleTo?: (row: TRow, admin: boolean) => boolean;
    /** This module's filter semantics over one row, mirroring its BE `buildWhere`. */
    matches?: (row: TRow, query: MockQuery) => boolean;
    /** Builds the created row; the module owns id shape and field coercion. */
    create?: (fields: MockFields, files: Record<string, File>) => TRow;
    /**
     * Merges a request over an existing row. `byId` distinguishes the two PUT routes for the
     * modules whose backend treats them differently (users' by-id route ignores `active`).
     */
    update?: (
        existing: TRow,
        fields: MockFields,
        files: Record<string, File>,
        byId: boolean
    ) => TRow;
    /** PUT /base with no id in the body targets this row (users: the session's own account). */
    defaultUpdateTargetId?: () => string | undefined;
    /**
     * The soft-delete transform — products and users toggle `deletedAt`, so deleting twice
     * restores. Declared → DELETE /base/:id soft-deletes unless `?hard=true`; absent → every
     * delete splices.
     */
    softDelete?: (row: TRow) => TRow;
    /**
     * Module-specific routes that must match BEFORE `/base/:id` — static segments like
     * `/products/categories` that the wildcard would otherwise swallow.
     */
    extraHandlers?: HttpHandler[];
}

/**
 * One paginated list envelope from an already-filtered row set — exported on its own for the
 * list-shaped endpoints (inventory's movements and levels) that are not full REST resources.
 */
export const paginatedListResponse = (rows: unknown[], query: MockQuery, schema: ZodType) => {
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    return toMockJsonResponse(
        createSuccessEnvelope({
            items: slicePaginatedData(rows, page, pageSize),
            meta: toPaginationMeta(rows.length, page, pageSize)
        }),
        { schema }
    );
};

export const defineRestResource = <TRow extends { id: string }>(
    config: RestResourceConfig<TRow>
): HttpHandler[] => {
    const {
        base,
        label,
        collection,
        schemas,
        visibleTo,
        matches,
        create,
        update,
        defaultUpdateTargetId,
        softDelete,
        extraHandlers
    } = config;
    const url = `${API_BASE}/${base}`;

    const notFound = () =>
        toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', `${label} not found`), {
            status: 404,
            schema: MockErrorResponse
        });

    const listResponse = (requestUrl: string | undefined, schema: ZodType, body?: unknown) => {
        const query = getQueryParameters(requestUrl, body);
        const admin = isCurrentMockUserAdmin();
        const rows = config
            .collection()
            .filter((row) => (visibleTo?.(row, admin) ?? true) && (matches?.(row, query) ?? true));
        return paginatedListResponse(rows, query, schema);
    };

    /**
     * @returns false when there is no such row — the shared 404. Hard delete drops the row; soft
     *          delete applies the module's transform, so calling it twice restores rather than
     *          deleting harder — exactly the BE's `remove()`.
     */
    const removeById = (id: string, hardDelete: boolean): boolean => {
        const rows = collection();
        const index = rows.findIndex((row) => row.id === id);
        if (index === -1) return false;

        if (hardDelete || !softDelete) rows.splice(index, 1);
        else rows[index] = softDelete(rows[index]);
        return true;
    };

    const handlers: HttpHandler[] = [];

    if (schemas.list)
        handlers.push(http.get(url, ({ request }) => listResponse(request.url, schemas.list!)));

    if (schemas.create && create)
        handlers.push(
            http.post(url, ({ request }) =>
                readRequestParts<MockFields>(request).then(({ fields, files }) => {
                    const created = create(fields ?? {}, files);
                    collection().unshift(created);
                    return toMockJsonResponse(createSuccessEnvelope(created), {
                        status: 201,
                        schema: schemas.create
                    });
                })
            )
        );

    if (schemas.update && update)
        handlers.push(
            http.put(url, ({ request }) =>
                readRequestParts<MockFields>(request).then(({ fields, files }) => {
                    const body = fields ?? {};
                    const targetId = asText(body.id, defaultUpdateTargetId?.() ?? '');
                    const rows = collection();
                    const index = rows.findIndex((row) => row.id === targetId);
                    if (index === -1) return notFound();

                    rows[index] = update(rows[index], body, files, false);
                    return toMockJsonResponse(createSuccessEnvelope(rows[index]), {
                        schema: schemas.update
                    });
                })
            )
        );

    if (schemas.delete)
        handlers.push(
            http.delete(url, ({ request }) =>
                readRequestBody<MockFields>(request).then((body) => {
                    const rows = collection();
                    const index = rows.findIndex((row) => row.id === asText(body.id));
                    if (index === -1) return notFound();

                    rows.splice(index, 1);
                    return toMockJsonResponse(createMessageResponse(`${label} deleted`), {
                        schema: schemas.delete
                    });
                })
            )
        );

    if (schemas.search)
        handlers.push(
            http.post(`${url}/search`, ({ request }) =>
                readRequestBody<MockFields>(request).then((body) =>
                    listResponse(request.url, schemas.search!, body)
                )
            )
        );

    // Static-segment routes (facets, …) must precede the `:id` wildcard below.
    handlers.push(...(extraHandlers ?? []));

    if (schemas.get)
        handlers.push(
            http.get(`${url}/:id`, ({ params }) => {
                const row = collection().find(({ id }) => id === String(params.id));
                // Hidden and absent answer identically when visibility is declared — see above.
                if (!row || !(visibleTo?.(row, isCurrentMockUserAdmin()) ?? true))
                    return notFound();

                return toMockJsonResponse(createSuccessEnvelope(row), { schema: schemas.get });
            })
        );

    if (schemas.updateById && update)
        handlers.push(
            http.put(`${url}/:id`, ({ request, params }) => {
                const rows = collection();
                const index = rows.findIndex(({ id }) => id === String(params.id));
                if (index === -1) return notFound();

                return readRequestParts<MockFields>(request).then(({ fields, files }) => {
                    rows[index] = update(rows[index], fields ?? {}, files, true);
                    return toMockJsonResponse(createSuccessEnvelope(rows[index]), {
                        schema: schemas.updateById
                    });
                });
            })
        );

    // `/hard` before `/:id`, or `hard` is matched as a row id.
    if (schemas.hardDeleteById)
        handlers.push(
            http.delete(`${url}/:id/hard`, ({ params }) => {
                if (!removeById(String(params.id), true)) return notFound();
                return toMockJsonResponse(createMessageResponse(`${label} deleted`), {
                    schema: schemas.hardDeleteById
                });
            })
        );

    if (schemas.deleteById)
        handlers.push(
            http.delete(`${url}/:id`, ({ request, params }) => {
                if (!removeById(String(params.id), readHardDeleteFlag(request.url)))
                    return notFound();
                return toMockJsonResponse(createMessageResponse(`${label} deleted`), {
                    schema: schemas.deleteById
                });
            })
        );

    return handlers;
};
