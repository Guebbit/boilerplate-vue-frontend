import { http, type HttpHandler } from 'msw';
import type { Product } from 'src/types';
import {
    ListProductsResponse,
    CreateProductResponse,
    UpdateProductResponse,
    DeleteProductResponse,
    SearchProductsResponse,
    GetProductByIdResponse,
    UpdateProductByIdResponse,
    DeleteProductByIdResponse,
    HardDeleteProductByIdResponse,
    GetCatalogueFacetsResponse
} from '@api/schemas';
import {
    createSuccessEnvelope,
    getIsoDateNow,
    isVisibleToCaller,
    mockDatabase,
    resolveMockImageUrl,
    asText,
    asOptionalText
} from '@mocks/mockDb.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { defineRestResource, type MockFields, type MockQuery } from '@mocks/rest-resource.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * The catalogue's filter semantics, mirroring `BE src/services/products.ts` `buildWhere`:
 * `arrayRegex` is a case-insensitive substring match over the array's values, `text` sweeps
 * id/title/description.
 */
const matchesProductFilters = (product: Product, query: MockQuery): boolean => {
    const text = asText(query.text).trim().toLowerCase();
    const id = (query.id ?? query.productId) ? String(query.id ?? query.productId) : undefined;
    const minPrice = query.minPrice === undefined ? undefined : Number(query.minPrice);
    const maxPrice = query.maxPrice === undefined ? undefined : Number(query.maxPrice);
    const category = asOptionalText(query.category)?.toLowerCase();
    const tag = asOptionalText(query.tag)?.toLowerCase();

    if (id && product.id !== id) return false;
    if (Number.isFinite(minPrice) && product.price < minPrice!) return false;
    if (Number.isFinite(maxPrice) && product.price > maxPrice!) return false;
    if (
        category &&
        !(product.categories ?? []).some((value) => value.toLowerCase().includes(category))
    )
        return false;
    if (tag && !(product.tags ?? []).some((value) => value.toLowerCase().includes(tag)))
        return false;
    if (
        text &&
        !product.id.toLowerCase().includes(text) &&
        !product.title.toLowerCase().includes(text) &&
        !(product.description ?? '').toLowerCase().includes(text)
    )
        return false;
    return true;
};

/** Field coercion shared by create and both updates — the module's half of the merge. */
const mergeProductFields = (
    existing: Product,
    fields: MockFields,
    files: Record<string, File>
): Product => ({
    ...existing,
    title: asText(fields.title, existing.title),
    description:
        fields.description === undefined ? existing.description : asText(fields.description),
    price: fields.price === undefined ? existing.price : Number(fields.price),
    active: fields.active === undefined ? existing.active : Boolean(fields.active),
    imageUrl: resolveMockImageUrl(files, existing.imageUrl),
    updatedAt: getIsoDateNow()
});

/**
 * One facet list with counts, over the PUBLIC catalogue only — exactly as `facets()` applies
 * `publicScope` in the BE: a facet held only by hidden products would render a chip that finds
 * nothing. Sorted by count descending, then name, matching the API's stable order.
 */
const countPublicFacets = (pick: (product: Product) => string[] | undefined) => {
    const byName = new Map<string, number>();
    for (const product of mockDatabase.sampleProducts) {
        if (!isVisibleToCaller(product, false)) continue;
        for (const name of pick(product) ?? []) byName.set(name, (byName.get(name) ?? 0) + 1);
    }
    return [...byName.entries()]
        .map(([name, count]) => ({ name, count }))
        .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

export const registerProductsMockHandlers = (): HttpHandler[] =>
    defineRestResource<Product>({
        base: 'products',
        label: 'Product',
        collection: () => mockDatabase.sampleProducts,
        schemas: {
            list: ListProductsResponse,
            search: SearchProductsResponse,
            create: CreateProductResponse,
            update: UpdateProductResponse,
            delete: DeleteProductResponse,
            get: GetProductByIdResponse,
            updateById: UpdateProductByIdResponse,
            deleteById: DeleteProductByIdResponse,
            hardDeleteById: HardDeleteProductByIdResponse
        },
        visibleTo: isVisibleToCaller,
        matches: matchesProductFilters,
        create: (fields, files) => ({
            id: `prod-${Date.now()}`,
            title: asText(fields.title, 'New product'),
            description: asText(fields.description),
            price: Number(fields.price ?? 0),
            active: fields.active === undefined ? true : Boolean(fields.active),
            imageUrl: resolveMockImageUrl(files),
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        }),
        update: mergeProductFields,
        // `undefined`, not an empty string: `isVisibleToCaller` tests for absence, matching the
        // BE's `$exists: false` — so deleting twice restores the product.
        softDelete: (product) => ({
            ...product,
            deletedAt: product.deletedAt ? undefined : getIsoDateNow()
        }),
        extraHandlers: [
            http.get(`${API_BASE}/products/categories`, () =>
                toMockJsonResponse(
                    createSuccessEnvelope({
                        categories: countPublicFacets(({ categories }) => categories),
                        tags: countPublicFacets(({ tags }) => tags)
                    }),
                    { schema: GetCatalogueFacetsResponse }
                )
            )
        ]
    });
