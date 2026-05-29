/* eslint-disable @typescript-eslint/naming-convention */
/*
 * This file is auto-generated from asyncapi.yaml via @asyncapi/modelina.
 * Run `npm run genasyncapi` after AsyncAPI contract changes.
 */

export interface IChatJoinCommand {
  'type': IAnonymousSchema1;
  'payload': IAnonymousSchema2;
}
export type IAnonymousSchema1 = "chat:join";
export interface IAnonymousSchema2 {
  'username': string;
  'room'?: IAnonymousSchema4;
}
export type IAnonymousSchema4 = "general";
export interface IChatMessageSendCommand {
  'type': IAnonymousSchema5;
  'payload': IAnonymousSchema6;
}
export type IAnonymousSchema5 = "chat:message:send";
export interface IAnonymousSchema6 {
  'message': string;
}
export interface IChatSystemPayload {
  'type': IAnonymousSchema8;
  'payload': IAnonymousSchema9;
}
export type IAnonymousSchema8 = "chat:system";
export interface IAnonymousSchema9 {
  'message': string;
  'room': IAnonymousSchema11;
  'timestamp': string;
}
export type IAnonymousSchema11 = "general";
export interface IChatMessagePayload {
  'type': IAnonymousSchema13;
  'payload': IAnonymousSchema14;
}
export type IAnonymousSchema13 = "chat:message";
export interface IAnonymousSchema14 {
  'id': string;
  'username': string;
  'room': IAnonymousSchema17;
  'message': string;
  'timestamp': string;
}
export type IAnonymousSchema17 = "general";
export interface IChatPresencePayload {
  'type': IAnonymousSchema20;
  'payload': IAnonymousSchema21;
}
export type IAnonymousSchema20 = "chat:presence";
export interface IAnonymousSchema21 {
  'room': IAnonymousSchema22;
  'users': string[];
}
export type IAnonymousSchema22 = "general";
export interface IChatJoinedEvent {
  'type': IAnonymousSchema25;
  'payload': IAnonymousSchema26;
}
export type IAnonymousSchema25 = "chat:joined";
export interface IAnonymousSchema26 {
  'username': string;
  'room': IAnonymousSchema28;
}
export type IAnonymousSchema28 = "general";
export interface IChatErrorEvent {
  'type': IAnonymousSchema29;
  'payload': IAnonymousSchema30;
}
export type IAnonymousSchema29 = "chat:error";
export interface IAnonymousSchema30 {
  'message': string;
}
export interface IObservabilityMetricsPayload {
  'timestamp': string;
  'uptimeSeconds': number;
  'memory': IAnonymousSchema34;
  'http': IAnonymousSchema39;
  'realtime': IAnonymousSchema42;
}
export interface IAnonymousSchema34 {
  'rss': number;
  'heapUsed': number;
  'heapTotal': number;
  'external': number;
}
export interface IAnonymousSchema39 {
  'totalRequests': number;
  'totalErrors': number;
}
export interface IAnonymousSchema42 {
  'websocketConnections': number;
  'sseClients': number;
}
export interface ICartCheckedOutEvent {
  'eventName': IAnonymousSchema45;
  'eventId': string;
  'occurredAt': string;
  'cartId': string;
  'userId': string;
  'orderId': string;
  'itemCount': number;
}
export type IAnonymousSchema45 = "ecommerce.cart.checked_out";
export interface IEmailJobPayload {
  'request': IAnonymousSchema52;
  'from'?: string;
  'templateName': string;
  'data': Record<string, unknown>;
}
export interface IAnonymousSchema52 {
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

export type IChatSystemUserJoinedEvent = IChatSystemPayload;
export type IChatSystemUserLeftEvent = IChatSystemPayload;
export type IChatMessageNewEvent = IChatMessagePayload;
export type IChatPresenceUpdatedEvent = IChatPresencePayload;
export type IMetricsSnapshotEvent = IObservabilityMetricsPayload;
export type IMetricsUpdatedEvent = IObservabilityMetricsPayload;
export type IHeartbeatEvent = IObservabilityMetricsPayload;
export type IEmailJobMessage = IEmailJobPayload;
export type IPdfJobMessage = IPdfJobPayload;
export type ICacheTagsInvalidatedMessage = ICacheTagsInvalidatedPayload;
export type IEmailJobConsumeMessage = IEmailJobPayload;
export type IPdfJobConsumeMessage = IPdfJobPayload;
export type ICacheTagsInvalidatedConsumeMessage = ICacheTagsInvalidatedPayload;

export const REALTIME_CHANNEL_NAMES = [
    "observability.heartbeat",
    "observability.metrics.snapshot",
    "observability.metrics.updated",
    "realtime.chat.command.join",
    "realtime.chat.command.message.send",
    "realtime.chat.event.error",
    "realtime.chat.event.joined",
    "realtime.chat.event.message.new",
    "realtime.chat.event.presence.updated",
    "realtime.chat.event.user.joined",
    "realtime.chat.event.user.left",
] as const;
export type IRealtimeChannelName = (typeof REALTIME_CHANNEL_NAMES)[number];

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

export const REALTIME_CHAT_EVENT_NAMES = [
    "realtime.chat.event.error",
    "realtime.chat.event.joined",
    "realtime.chat.event.message.new",
    "realtime.chat.event.presence.updated",
    "realtime.chat.event.user.joined",
    "realtime.chat.event.user.left",
] as const;
export type IChatEventName = (typeof REALTIME_CHAT_EVENT_NAMES)[number];
export interface IChatEventPayloadMap {
    "realtime.chat.event.error": IChatErrorEvent;
    "realtime.chat.event.joined": IChatJoinedEvent;
    "realtime.chat.event.message.new": IChatMessageNewEvent;
    "realtime.chat.event.presence.updated": IChatPresenceUpdatedEvent;
    "realtime.chat.event.user.joined": IChatSystemUserJoinedEvent;
    "realtime.chat.event.user.left": IChatSystemUserLeftEvent;
}
export type IChatEventPayload<TEventName extends IChatEventName> = IChatEventPayloadMap[TEventName];

export type IChatCommand = IChatJoinCommand | IChatMessageSendCommand;
