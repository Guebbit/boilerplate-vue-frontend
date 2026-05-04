import { AccountApi, AdminApi, AuthApi, CartApi, OrdersApi, ProductsApi, UsersApi } from '@api';
import { Configuration } from '../../api';

import httpClient from '@/utils/http.ts';

/**
 * Shared OpenAPI configuration.
 * The basePath is driven by the VITE_API_URL env variable so that it matches
 * the custom axios instance in http.ts (no duplicate base-URL definition).
 */
const apiConfiguration = new Configuration({
    basePath: import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
});

/**
 * All generated API classes share the same configuration and the custom
 * http.ts axios instance so that auth headers, language headers and the
 * automatic token-refresh interceptor are applied to every request.
 */
export const accountApi = new AccountApi(apiConfiguration, undefined, httpClient);
export const adminApi = new AdminApi(apiConfiguration, undefined, httpClient);
export const authApi = new AuthApi(apiConfiguration, undefined, httpClient);
export const cartApi = new CartApi(apiConfiguration, undefined, httpClient);
export const ordersApi = new OrdersApi(apiConfiguration, undefined, httpClient);
export const productsApi = new ProductsApi(apiConfiguration, undefined, httpClient);
export const usersApi = new UsersApi(apiConfiguration, undefined, httpClient);
