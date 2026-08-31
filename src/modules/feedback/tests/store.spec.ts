/**
 * @module
 * The feedback store, transport-mocked like the wishlist's spec: `orvalMutator` is a router keyed
 * on `METHOD /url`, so the generated client and the store under test stay real. What is worth
 * pinning is whole-list replacement (the inbox renders what the API answered, never a local guess)
 * and the status update reloading the inbox it changed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFeedbackStore } from '@/modules/feedback/store.ts';
import { orvalMutator } from '@/infrastructure/http';

/**
 * Fixture ticket returned by the mocked `orvalMutator` responses below.
 */
const TICKET = {
    id: 'f1',
    email: 'curious@example.com',
    subject: 'A question',
    message: 'About the cats',
    status: 'new'
};

/**
 * Per-test response table, keyed by `METHOD /url`; reset in `beforeEach`.
 */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(responses[key]);
    })
}));

/**
 * The URLs `orvalMutator` was actually called with, in call order.
 */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'POST /feedback/contact': { data: TICKET },
        'GET /feedback': { data: { items: [TICKET] } },
        'PUT /feedback/f1': { data: { ...TICKET, status: 'resolved' } },
        'DELETE /feedback/f1': { data: undefined }
    };
});

describe('submitContact', () => {
    it('posts the public form', () =>
        useFeedbackStore()
            .submitContact({
                email: 'curious@example.com',
                subject: 'A question',
                message: 'About the cats'
            })
            .then(() => {
                expect(requestedUrls()).toEqual(['/feedback/contact']);
            }));

    it("passes the honeypot through untouched — deciding what it means is the BE's job", () =>
        useFeedbackStore()
            .submitContact({
                email: 'curious@example.com',
                subject: 'A question',
                message: 'About the cats',
                website: 'https://spam-bot.example'
            })
            .then(() => {
                const [request] = vi.mocked(orvalMutator).mock.calls[0] as [{ data?: unknown }];
                expect(request.data).toMatchObject({ website: 'https://spam-bot.example' });
            }));
});

describe('fetchRequests', () => {
    it('replaces the inbox with what the API answered', () => {
        const store = useFeedbackStore();
        return store.fetchRequests().then(() => {
            expect(store.requests.map(({ id }) => id)).toEqual(['f1']);
        });
    });
});

describe('updateStatus', () => {
    it('writes the status, then reloads the inbox it changed', () => {
        const store = useFeedbackStore();
        return store
            .fetchRequests()
            .then(() => store.updateStatus('f1', 'resolved'))
            .then(() => {
                // The reload is the point: the row worth rendering is the API's.
                expect(requestedUrls()).toEqual(['/feedback', '/feedback/f1', '/feedback']);
            });
    });
});

describe('deleteRequest', () => {
    it('removes the ticket, then reloads the inbox it emptied', () => {
        const store = useFeedbackStore();
        return store
            .fetchRequests()
            .then(() => store.deleteRequest('f1'))
            .then(() => {
                // Same reload rule as updateStatus, for the same reason.
                expect(requestedUrls()).toEqual(['/feedback', '/feedback/f1', '/feedback']);
            });
    });
});
