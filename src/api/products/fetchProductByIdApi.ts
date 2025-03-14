import axios from '@/utils/http.ts';
import type { IProduct, IProductIdentification } from '@/types'

/**
 * Get target product
 * @param id
 */
export const fetchProductByIdApi = (id: IProductIdentification) =>
    axios.get<IProduct>('products/details/' + id)