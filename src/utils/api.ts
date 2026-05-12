import { OpenAPI } from '@api';
import { getCurrentLocale } from '@/utils/i18n.ts';

/**
 * Configure the openapi-typescript-codegen OpenAPI singleton.
 * The base URL is driven by the VITE_API_URL env variable.
 * The access token is resolved lazily at request time to avoid circular imports.
 */
OpenAPI.BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
OpenAPI.WITH_CREDENTIALS = true;
OpenAPI.CREDENTIALS = 'include';
OpenAPI.TOKEN = async () => {
    const { useProfileStore } = await import('@/stores/profile.ts');
    return useProfileStore().accessToken ?? '';
};
// eslint-disable-next-line @typescript-eslint/naming-convention
OpenAPI.HEADERS = async () => ({ 'Accept-Language': getCurrentLocale() });

/**
 * Re-export generated service classes so that callers can import from a single
 * location while being guaranteed that the OpenAPI singleton is already configured.
 */
export {
    AccountService,
    AdminService,
    AuthService,
    CartService,
    OrdersService,
    ProductsService,
    UsersService
} from '@api';
