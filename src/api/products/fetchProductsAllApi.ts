import axios from '@/utils/http.ts';
import type { IProduct } from '@/types'

/**
 * List all products
 */
export const fetchProductsAllApi = () =>
    axios.get<IProduct[]>('products/all');