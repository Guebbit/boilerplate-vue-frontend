/**
 * The feedback store — transport-mocked like the wishlist's spec: `orvalMutator` is a router
 * keyed on `METHOD /url`, the generated client and this store are real. What is worth pinning
 * is whole-list replacement (the inbox renders what the API answered, never a local guess) and
 * the status update reloading the inbox it changed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFeedbackStore } from '@/modules/feedback/store.ts';
import { orvalMutator } from '@/infrastructure/http';

const TICKET = {
    id: 'f1',
    email: 'curious@example.com',
    subject: 'A question',
    message: 'About the cats',
    status: 'new'
};

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(responses[key]);
    })
}));

const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'POST /feedback/contact': { data: TICKET },
        'GET /feedback': { data: { items: [TICKET] } },
        'PUT /feedback/f1': { data: { ...TICKET, status: 'resolved' } }
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
});

describe('fetchRequests', () => {
    it('replaces the inbox with what the API answered', () => {
        const store = useFeedbackStore();
        return store.fetchRequests().then(() => {
            expect(store.requests.map(({ id }) => id)).toEqual(['f1']);
        });
    });

    it('reads a payload with no items as an empty inbox, not a crash', () => {
        responses['GET /feedback'] = { data: undefined };
        const store = useFeedbackStore();
        return store.fetchRequests().then(() => {
            expect(store.requests).toEqual([]);
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
