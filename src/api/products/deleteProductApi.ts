import axios from '@/utils/http.ts';
import type { IProductIdentification } from "@/types";

/**
 * Delete target product
 * @param id
 */
export const deleteProductApi = (id: IProductIdentification) =>
    axios.delete('products/delete/' + id)