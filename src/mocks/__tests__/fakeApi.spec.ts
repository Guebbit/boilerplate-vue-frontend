import { describe, it, expect, beforeEach } from 'vitest';
import { AxiosHeaders } from 'axios';
import { fakeApiAdapter, resetFakeApiState } from '@/mocks/fakeApi.ts';

const makeConfig = (
    method: 'get' | 'post',
    url: string,
    data?: unknown,
    token?: string
) => ({
    method,
    url,
    data,
    headers: AxiosHeaders.from(
        token
            ? {
                Authorization: `Bearer ${token}`
            }
            : {}
    )
});

describe('fakeApiAdapter', () => {
    beforeEach(() => {
        resetFakeApiState();
    });

    it('returns products list with pagination metadata', async () => {
        const response = await fakeApiAdapter(makeConfig('get', '/products?page=1&pageSize=2'));

        const payload = response.data as {
            success: boolean;
            data: { items: unknown[]; meta: { page: number; pageSize: number } };
        };

        expect(payload.success).toBe(true);
        expect(payload.data.items.length).toBe(2);
        expect(payload.data.meta.page).toBe(1);
        expect(payload.data.meta.pageSize).toBe(2);
    });

    it('supports authenticated cart checkout flow', async () => {
        const loginResponse = await fakeApiAdapter(
            makeConfig('post', '/account/login', {
                email: 'root@root.it',
                password: 'RootRoot_123'
            })
        );
        const token = (loginResponse.data as { data: { token: string } }).data.token;

        const checkoutResponse = await fakeApiAdapter(makeConfig('post', '/cart/checkout', undefined, token));
        const checkoutPayload = checkoutResponse.data as { data: { order: { id: string } } };
        expect(checkoutPayload.data.order.id).toBeTruthy();

        const cartResponse = await fakeApiAdapter(makeConfig('get', '/cart', undefined, token));
        const cartPayload = cartResponse.data as { data: { items: unknown[] } };
        expect(cartPayload.data.items.length).toBe(0);
    });
});
