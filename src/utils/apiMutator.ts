import type { AxiosRequestConfig } from 'axios';
import httpClient from '@/utils/http.ts';

/**
 * Custom orval mutator: routes all generated API calls through the shared
 * httpClient instance (defined in http.ts).
 *
 * httpClient already handles:
 * - Base URL (VITE_API_URL)
 * - Bearer token header injection
 * - Accept-Language header
 * - Cookie forwarding (refresh token)
 * - 401 -> token refresh -> retry logic
 * - Response unwrapping: the response interceptor returns response.data
 *   directly, so the Promise resolves with the JSON envelope (e.g. CartResponseEnvelope)
 *   rather than the raw AxiosResponse.
 *
 * The second generic parameter <never, T> tells TypeScript that the return
 * type is T (matching what the interceptor actually returns at runtime).
 */
export const apiMutator = <T>(config: AxiosRequestConfig): Promise<T> =>
    httpClient.request<never, T>(config);
