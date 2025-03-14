import axios from '@/utils/http.ts';
import type { IProduct, IProductForm, IProductIdentification } from '@/types'

/**
 * Update target product
 *
 * @param id
 * @param productData
 */
export const updateProductApi = (id: IProductIdentification, productData: Partial<IProductForm>) =>
    axios.put<IProduct>('products/edit/' + id, productData);