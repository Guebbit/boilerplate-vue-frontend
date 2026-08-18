import { http, type HttpHandler } from 'msw';
import type { Shipment, ShippingMethod } from 'src/types';
import {
    ListShippingMethodsResponse,
    GetShipmentByOrderResponse,
    AdvanceCourierResponse
} from '@api/schemas';
import {
    createErrorEnvelope,
    createSuccessEnvelope,
    getCurrentMockUser,
    getIsoDateNow,
    isCurrentMockUserAdmin,
    mockDatabase,
    recordMockEmail
} from '@mocks/mockDb.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// The collections and cross-module listeners live in @mocks/mockCommerce.ts — the support
// layer, like `createMockOrder`, because module mock files must not import each other.
import { MOCK_SHIPPING_METHODS } from '@mocks/mockCommerce.ts';

export const registerDeliveryMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/delivery/methods`, () =>
        toMockJsonResponse(createSuccessEnvelope({ methods: MOCK_SHIPPING_METHODS }), {
            schema: ListShippingMethodsResponse
        })
    ),

    http.get(`${API_BASE}/delivery/order/:orderId`, ({ params }) => {
        const currentUser = getCurrentMockUser();
        const order = mockDatabase.sampleOrders.find(({ id }) => id === String(params.orderId));
        const owned =
            order && currentUser && (isCurrentMockUserAdmin() || order.userId === currentUser.id);
        const shipment = (mockDatabase.sampleShipments ?? []).find(
            (entry) => entry.orderId === String(params.orderId)
        );
        if (!owned || !shipment)
            return toMockJsonResponse(
                createErrorEnvelope(404, 'NOT_FOUND', 'Nothing has shipped for this order yet'),
                { status: 404, schema: MockErrorResponse }
            );
        return toMockJsonResponse(createSuccessEnvelope(shipment), {
            schema: GetShipmentByOrderResponse
        });
    }),

    // The fake courier: order first (only `shipped` moves), then the parcel — the BE's ordering.
    http.post(`${API_BASE}/delivery/advance`, () => {
        if (!isCurrentMockUserAdmin())
            return toMockJsonResponse(createErrorEnvelope(403, 'FORBIDDEN', 'Admin only'), {
                status: 403,
                schema: MockErrorResponse
            });
        let advanced = 0;
        for (const shipment of mockDatabase.sampleShipments ?? []) {
            if (shipment.status !== 'shipped') continue;
            const order = mockDatabase.sampleOrders.find(({ id }) => id === shipment.orderId);
            if (!order || order.status !== 'shipped') continue;
            order.status = 'delivered';
            order.updatedAt = getIsoDateNow();
            shipment.status = 'delivered';
            shipment.deliveredAt = getIsoDateNow();
            shipment.updatedAt = getIsoDateNow();
            advanced += 1;
        }
        return toMockJsonResponse(createSuccessEnvelope({ advanced }), {
            schema: AdvanceCourierResponse
        });
    })
];
