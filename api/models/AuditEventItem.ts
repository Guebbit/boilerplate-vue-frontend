/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AuditEventItem = {
    actorUserId: string;
    actorRole: 'admin' | 'user' | 'anonymous';
    /**
     * Dot-notation action name (e.g. auth.login.succeeded)
     */
    action: string;
    outcome: 'success' | 'failure';
    ip?: string;
    userAgent?: string;
    requestId?: string;
    traceId?: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
    timestamp: string;
    level: 'info' | 'warn';
};

