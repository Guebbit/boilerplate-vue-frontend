import { http, type HttpHandler } from 'msw';
import type { FeedbackRequest } from 'src/types';
import {
    CreateFeedbackRequestResponse,
    ListFeedbackRequestsResponse,
    UpdateFeedbackRequestStatusResponse
} from '@api/schemas';
import {
    createErrorEnvelope,
    createSuccessEnvelope,
    getIsoDateNow,
    mockDatabase,
    readRequestBody,
    toPaginationMeta
} from '@mocks/mockDb.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleFeedbackRequests: FeedbackRequest[];
    }
}

/*
 * The inbox starts EMPTY, deliberately: the BE seeds no tickets, and mock/live parity means the
 * demo flow is the contact form itself — submit one, then read it in the inbox. The declaration
 * merge above registers the collection so `resetMockDatabase`'s generic array-clearing wipes it
 * between tests without this module being named anywhere central.
 */
mockDatabase.sampleFeedbackRequests = mockDatabase.sampleFeedbackRequests ?? [];

let feedbackIdCounter = 0;

export const registerFeedbackMockHandlers = (): HttpHandler[] => [
    // The public contact form — no session required, exactly like the real endpoint.
    http.post(`${API_BASE}/feedback/contact`, ({ request }) =>
        readRequestBody<Partial<FeedbackRequest>>(request).then((requestBody) => {
            feedbackIdCounter += 1;
            const created: FeedbackRequest = {
                id: `feedback-${feedbackIdCounter}`,
                name: requestBody.name,
                email: requestBody.email ?? '',
                subject: requestBody.subject ?? '',
                message: requestBody.message ?? '',
                status: 'new',
                createdAt: getIsoDateNow(),
                updatedAt: getIsoDateNow()
            };
            (mockDatabase.sampleFeedbackRequests ??= []).unshift(created);
            return toMockJsonResponse(createSuccessEnvelope(created), {
                status: 201,
                schema: CreateFeedbackRequestResponse
            });
        })
    ),

    http.get(`${API_BASE}/feedback`, () => {
        const items = mockDatabase.sampleFeedbackRequests ?? [];
        return toMockJsonResponse(
            createSuccessEnvelope({
                items,
                meta: toPaginationMeta(items.length, 1, Math.max(items.length, 10))
            }),
            { schema: ListFeedbackRequestsResponse }
        );
    }),

    http.put(`${API_BASE}/feedback/:requestId`, ({ request, params }) =>
        readRequestBody<{ status?: FeedbackRequest['status'] }>(request).then((requestBody) => {
            const ticket = (mockDatabase.sampleFeedbackRequests ?? []).find(
                ({ id }) => id === String(params.requestId)
            );
            if (!ticket)
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Feedback not found'),
                    { status: 404, schema: MockErrorResponse }
                );
            if (requestBody.status) ticket.status = requestBody.status;
            ticket.updatedAt = getIsoDateNow();
            return toMockJsonResponse(createSuccessEnvelope(ticket), {
                schema: UpdateFeedbackRequestStatusResponse
            });
        })
    )
];
