import { http, type HttpHandler } from 'msw';
import {
    GetWishlistResponse,
    AddWishlistItemResponse,
    RemoveWishlistItemResponse,
    MoveWishlistItemToCartResponse
} from '@api/schemas';
import {
    createErrorEnvelope,
    createSuccessEnvelope,
    isVisibleToCaller,
    mockDatabase,
    readRequestBody
} from '@mocks/mockShared.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** The whole-list payload every wishlist endpoint answers with. */
const wishlistEnvelope = () => createSuccessEnvelope({ items: mockDatabase.sampleWishlistItems });

export const registerWishlistMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/wishlist`, () =>
        toMockJsonResponse(wishlistEnvelope(), { schema: GetWishlistResponse })
    ),

    // Save a product — public-catalogue products only, idempotent by de-duplication: the same
    // two rules the BE's `$addToSet` + `publicScope` lookup enforce.
    http.post(`${API_BASE}/wishlist`, ({ request }) =>
        readRequestBody<{ productId?: string }>(request).then((requestBody) => {
            const productId = String(requestBody.productId ?? '');
            const product = mockDatabase.sampleProducts.find(({ id }) => id === productId);
            if (!product || !isVisibleToCaller(product, false))
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'),
                    { status: 404, schema: MockErrorResponse }
                );
            if (!mockDatabase.sampleWishlistItems.some((item) => item.productId === productId))
                mockDatabase.sampleWishlistItems.push({ productId });
            return toMockJsonResponse(wishlistEnvelope(), { schema: AddWishlistItemResponse });
        })
    ),

    // Before the bare `/:productId` route for the same order rule everywhere else: `move-to-cart`
    // is the deeper path and MSW matches in registration order.
    http.post(`${API_BASE}/wishlist/:productId/move-to-cart`, ({ params }) => {
        const productId = String(params.productId);
        const saved = mockDatabase.sampleWishlistItems.some((item) => item.productId === productId);
        if (!saved)
            return toMockJsonResponse(
                createErrorEnvelope(404, 'NOT_FOUND', 'Not on the wishlist'),
                { status: 404, schema: MockErrorResponse }
            );

        // Cart first, wishlist second — the BE's order, kept so a mocked failure mid-way leaves
        // the same "still saved" state the real one would.
        const line = mockDatabase.sampleCartItems.find((item) => item.productId === productId);
        if (line) line.quantity += 1;
        else mockDatabase.sampleCartItems.push({ productId, quantity: 1 });

        mockDatabase.sampleWishlistItems = mockDatabase.sampleWishlistItems.filter(
            (item) => item.productId !== productId
        );
        return toMockJsonResponse(wishlistEnvelope(), {
            schema: MoveWishlistItemToCartResponse
        });
    }),

    http.delete(`${API_BASE}/wishlist/:productId`, ({ params }) => {
        const productId = String(params.productId);
        if (!mockDatabase.sampleWishlistItems.some((item) => item.productId === productId))
            return toMockJsonResponse(
                createErrorEnvelope(404, 'NOT_FOUND', 'Not on the wishlist'),
                { status: 404, schema: MockErrorResponse }
            );
        mockDatabase.sampleWishlistItems = mockDatabase.sampleWishlistItems.filter(
            (item) => item.productId !== productId
        );
        return toMockJsonResponse(wishlistEnvelope(), { schema: RemoveWishlistItemResponse });
    })
];
