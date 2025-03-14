import axios from '@/utils/http.ts';
import type { IPagination, IProduct } from '@/types'

/**
 * List products with pagination logics
 */
export const fetchProductsApi = (page = 1, size = 9) =>
    axios.get<IPagination<IProduct[]>>('products/list/' + page + '/' + size);