/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Email } from './Email';
import type { Id } from './Id';
export type FeedbackRequest = {
    id: Id;
    name?: string;
    email: Email;
    subject: string;
    message: string;
    status: 'new' | 'in_progress' | 'resolved' | 'spam';
    adminNotes?: string;
    respondedAt?: string;
    createdAt: string;
    updatedAt?: string;
};

