/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Email } from './Email';
import type { Id } from './Id';
import type { OrderItem } from './OrderItem';
export type Order = {
    id: Id;
    userId: Id;
    email: Email;
    items: Array<OrderItem>;
    total: number;
    /**
     * Optional order notes
     */
    notes?: string;
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    createdAt?: string;
    updatedAt?: string;
};

