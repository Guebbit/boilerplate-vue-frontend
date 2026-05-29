/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any */
/*
 * This file is auto-generated from asyncapi.yaml via @asyncapi/modelina.
 * Run `npm run genasyncapi` after AsyncAPI contract changes.
 */

export interface IChatSystemPayload {
  type: IAnonymousSchema_10;
  payload: IAnonymousSchema_11;
}

export type IAnonymousSchema_10 = "chat:system";

export interface IAnonymousSchema_11 {
  message: string;
  room: IAnonymousSchema_13;
  timestamp: string;
}

export type IAnonymousSchema_13 = "general";

export interface IChatMessagePayload {
  type: IAnonymousSchema_15;
  payload: IAnonymousSchema_16;
}

export type IAnonymousSchema_15 = "chat:message";

export interface IAnonymousSchema_16 {
  id: string;
  username: string;
  room: IAnonymousSchema_19;
  message: string;
  timestamp: string;
}

export type IAnonymousSchema_19 = "general";

export interface IChatPresencePayload {
  type: IAnonymousSchema_22;
  payload: IAnonymousSchema_23;
}

export type IAnonymousSchema_22 = "chat:presence";

export interface IAnonymousSchema_23 {
  room: IAnonymousSchema_24;
  users: string[];
}

export type IAnonymousSchema_24 = "general";

export interface IObservabilityMetricsPayload {
  timestamp: string;
  uptimeSeconds: number;
  memory: IAnonymousSchema_38;
  http: IAnonymousSchema_43;
  realtime: IAnonymousSchema_46;
}

export interface IAnonymousSchema_38 {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface IAnonymousSchema_43 {
  totalRequests: number;
  totalErrors: number;
}

export interface IAnonymousSchema_46 {
  websocketConnections: number;
  sseClients: number;
}

export interface IEmailJobPayload {
  request: IAnonymousSchema_57;
  from?: string;
  templateName: string;
  data: Map<string, any>;
}

export interface IAnonymousSchema_57 {
  to: string;
  subject?: string;
  text?: string;
  html?: string;
}

export interface IPdfJobPayload {
  templatePath: string;
  templateData: Map<string, any>;
  outputPath: string;
}

export interface ICacheTagsInvalidatedPayload {
  tags: string[];
  origin: string;
  timestamp: string;
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

export type IRealtimeChannelName = "realtime.chat.command.join" | "realtime.chat.command.message.send" | "realtime.chat.event.user.joined" | "realtime.chat.event.user.left" | "realtime.chat.event.message.new" | "realtime.chat.event.presence.updated" | "realtime.chat.event.joined" | "realtime.chat.event.error" | "observability.metrics.snapshot" | "observability.metrics.updated" | "observability.heartbeat";
