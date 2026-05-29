/* eslint-disable @typescript-eslint/naming-convention */
/*
 * This file is auto-generated from asyncapi.yaml via @asyncapi/modelina.
 * Run `npm run genasyncapi` after AsyncAPI contract changes.
 */

export interface IAnonymousSchema1 {
  'type': IAnonymousSchema2;
  'payload': IAnonymousSchema3;
}
export type IAnonymousSchema2 = "chat:join";
export interface IAnonymousSchema3 {
  'username': string;
  'room'?: IAnonymousSchema5;
}
export type IAnonymousSchema5 = "general";
export interface IAnonymousSchema6 {
  'type': IAnonymousSchema7;
  'payload': IAnonymousSchema8;
}
export type IAnonymousSchema7 = "chat:message:send";
export interface IAnonymousSchema8 {
  'message': string;
}
export interface IChatSystemPayload {
  'type': IAnonymousSchema10;
  'payload': IAnonymousSchema11;
}
export type IAnonymousSchema10 = "chat:system";
export interface IAnonymousSchema11 {
  'message': string;
  'room': IAnonymousSchema13;
  'timestamp': string;
}
export type IAnonymousSchema13 = "general";
export interface IChatMessagePayload {
  'type': IAnonymousSchema15;
  'payload': IAnonymousSchema16;
}
export type IAnonymousSchema15 = "chat:message";
export interface IAnonymousSchema16 {
  'id': string;
  'username': string;
  'room': IAnonymousSchema19;
  'message': string;
  'timestamp': string;
}
export type IAnonymousSchema19 = "general";
export interface IChatPresencePayload {
  'type': IAnonymousSchema22;
  'payload': IAnonymousSchema23;
}
export type IAnonymousSchema22 = "chat:presence";
export interface IAnonymousSchema23 {
  'room': IAnonymousSchema24;
  'users': string[];
}
export type IAnonymousSchema24 = "general";
export interface IAnonymousSchema27 {
  'type': IAnonymousSchema28;
  'payload': IAnonymousSchema29;
}
export type IAnonymousSchema28 = "chat:joined";
export interface IAnonymousSchema29 {
  'username': string;
  'room': IAnonymousSchema31;
}
export type IAnonymousSchema31 = "general";
export interface IAnonymousSchema32 {
  'type': IAnonymousSchema33;
  'payload': IAnonymousSchema34;
}
export type IAnonymousSchema33 = "chat:error";
export interface IAnonymousSchema34 {
  'message': string;
}
export interface IObservabilityMetricsPayload {
  'timestamp': string;
  'uptimeSeconds': number;
  'memory': IAnonymousSchema38;
  'http': IAnonymousSchema43;
  'realtime': IAnonymousSchema46;
}
export interface IAnonymousSchema38 {
  'rss': number;
  'heapUsed': number;
  'heapTotal': number;
  'external': number;
}
export interface IAnonymousSchema43 {
  'totalRequests': number;
  'totalErrors': number;
}
export interface IAnonymousSchema46 {
  'websocketConnections': number;
  'sseClients': number;
}
export interface IAnonymousSchema49 {
  'eventName': IAnonymousSchema50;
  'eventId': string;
  'occurredAt': string;
  'cartId': string;
  'userId': string;
  'orderId': string;
  'itemCount': number;
}
export type IAnonymousSchema50 = "ecommerce.cart.checked_out";
export interface IEmailJobPayload {
  'request': IAnonymousSchema57;
  'from'?: string;
  'templateName': string;
  'data': Record<string, unknown>;
}
export interface IAnonymousSchema57 {
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

export type IChatJoinCommand = {
    type: "chat:join";
    payload: {
        username: string;
        room?: "general";
    };
};
export type IChatMessageSendCommand = {
    type: "chat:message:send";
    payload: {
        message: string;
    };
};
export type IChatSystemUserJoinedEvent = IChatSystemPayload;
export type IChatSystemUserLeftEvent = IChatSystemPayload;
export type IChatMessageNewEvent = IChatMessagePayload;
export type IChatPresenceUpdatedEvent = IChatPresencePayload;
export type IChatErrorEvent = {
    type: "chat:error";
    payload: {
        message: string;
    };
};
export type IChatJoinedEvent = {
    type: "chat:joined";
    payload: {
        username: string;
        room: "general";
    };
};
export type IMetricsSnapshotEvent = IObservabilityMetricsPayload;
export type IMetricsUpdatedEvent = IObservabilityMetricsPayload;
export type IHeartbeatEvent = IObservabilityMetricsPayload;
export type ICartCheckedOutEvent = {
    eventName: "ecommerce.cart.checked_out";
    eventId: string;
    occurredAt: string;
    cartId: string;
    userId: string;
    orderId: string;
    itemCount: number;
};
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
