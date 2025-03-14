import axios from '@/utils/http.ts';
import type { IProduct, IProductForm } from "@/types";

/**
 * List of Products
 * @param ProductData
 */
export const createProductApi = (ProductData: IProductForm) =>
    axios.post<IProduct>('/products/add', ProductData);