/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Email } from './Email';
import type { Page } from './Page';
import type { PageSize } from './PageSize';
import type { Text } from './Text';
export type SearchFeedbackRequestsRequest = {
    page?: Page;
    pageSize?: PageSize;
    text?: Text;
    status?: 'new' | 'in_progress' | 'resolved' | 'spam';
    email?: Email;
};

