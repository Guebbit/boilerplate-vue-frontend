/* eslint-disable @typescript-eslint/naming-convention */
/*
 * This file is auto-generated from asyncapi.yaml via @asyncapi/modelina.
 * Run `npm run genasyncapi` after AsyncAPI contract changes.
 */

export interface IObservabilityMetricsPayload {
  'timestamp': string;
  'uptimeSeconds': number;
  'memory': IAnonymousSchema3;
  'http': IAnonymousSchema8;
  'realtime': IAnonymousSchema11;
}
export interface IAnonymousSchema3 {
  'rss': number;
  'heapUsed': number;
  'heapTotal': number;
  'external': number;
}
export interface IAnonymousSchema8 {
  'totalRequests': number;
  'totalErrors': number;
}
export interface IAnonymousSchema11 {
  'sseClients': number;
}
export interface ICartCheckedOutEvent {
  'eventName': IAnonymousSchema13;
  'eventId': string;
  'occurredAt': string;
  'cartId': string;
  'userId': string;
  'orderId': string;
  'itemCount': number;
}
export type IAnonymousSchema13 = "ecommerce.cart.checked_out";
export interface IEmailJobPayload {
  'request': IAnonymousSchema20;
  'from'?: string;
  'templateName': string;
  'data': Record<string, unknown>;
}
export interface IAnonymousSchema20 {
  'to': string;
  'subject'?: string;
  'text'?: string;
  'html'?: string;
}
export interface IPdfJobPayload {
  'templatePath': string;
  'templateData': Record<string, unknown>;
  'outputPath': string;
}
export interface ICacheTagsInvalidatedPayload {
  'tags': string[];
  'origin': string;
  'timestamp': string;
}

export type IMetricsSnapshotEvent = IObservabilityMetricsPayload;
export type IMetricsUpdatedEvent = IObservabilityMetricsPayload;
export type IHeartbeatEvent = IObservabilityMetricsPayload;
export type IEmailJobMessage = IEmailJobPayload;
export type IPdfJobMessage = IPdfJobPayload;
export type ICacheTagsInvalidatedMessage = ICacheTagsInvalidatedPayload;
export type IEmailJobConsumeMessage = IEmailJobPayload;
export type IPdfJobConsumeMessage = IPdfJobPayload;
export type ICacheTagsInvalidatedConsumeMessage = ICacheTagsInvalidatedPayload;

export const REALTIME_SSE_EVENT_NAMES = [
    "observability.heartbeat",
    "observability.metrics.snapshot",
    "observability.metrics.updated",
] as const;
export type ISseEventName = (typeof REALTIME_SSE_EVENT_NAMES)[number];
export interface ISseEventPayloadMap {
    "observability.heartbeat": IHeartbeatEvent;
    "observability.metrics.snapshot": IMetricsSnapshotEvent;
    "observability.metrics.updated": IMetricsUpdatedEvent;
}
export type ISseEventPayload<TEventName extends ISseEventName> = ISseEventPayloadMap[TEventName];
