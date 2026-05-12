/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminHealthIntegrations } from './AdminHealthIntegrations';
import type { AdminHealthMemory } from './AdminHealthMemory';
import type { AdminHealthSystem } from './AdminHealthSystem';
export type AdminHealth = {
    status: 'ok' | 'degraded';
    environment: string;
    service: string;
    nodeVersion: string;
    uptimeSeconds: number;
    database: {
        status: 'connected' | 'connecting' | 'disconnected';
    };
    integrations?: AdminHealthIntegrations;
    memory?: AdminHealthMemory;
    system?: AdminHealthSystem;
    timestamp: string;
};

