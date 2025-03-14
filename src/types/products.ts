/*
 *
 */
export interface IProduct {
    id: number,
    title: string,
    price: number,
    description?: string,
    imageUrl?: string,
    active?: boolean,
    quantity?: number
}

/**
 * User form to edit its profile
 */
export type IProductForm = Pick<IProduct, 'title' | 'price' | 'description' | 'imageUrl'>;

/**
 *
 */
export type IProductIdentification = IProduct['id'];