/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AuditEventItem = {
    actor_user_id: string;
    actor_role: 'admin' | 'user' | 'anonymous';
    /**
     * Dot-notation action name (e.g. auth.login.succeeded)
     */
    action: string;
    outcome: 'success' | 'failure';
    ip?: string;
    user_agent?: string;
    request_id?: string;
    trace_id?: string;
    target_type?: string;
    target_id?: string;
    metadata?: Record<string, any>;
    timestamp: string;
    level: 'info' | 'warn';
};

