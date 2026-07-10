# Endpoints

All HTTP endpoints grouped by feature. These are what the generated client in `contracts/rest/index.ts` calls.
The **Auth** column shows the minimum access level the backend requires.

> The backend-specific implementation details (Redis caching strategy, RabbitMQ events, PDF generation) are intentionally omitted here — they are transparent to the FE. What matters to the FE is the HTTP method, path, auth requirement, and response shape.

## System (public)

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/` | none | Public ping |

## Observability

Used by the Admin Dashboard. See [Observability Endpoints](./observability.md) for response shapes and the composable that fetches them.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/observability/events` | none | SSE stream: live metrics snapshot every 5 s |
| GET | `/observability/health` | admin | Full health snapshot |
| GET | `/observability/metrics/overview` | admin | Curated KPI JSON |
| GET | `/observability/audit` | admin | Recent audit events |

## Account & Auth

JWT-based authentication. Login returns an `accessToken` in the body and sets a `refreshToken` in an HttpOnly cookie. See [Security](../tools/security.md) for how the FE handles these.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| POST | `/account/login` | none | Authenticate and get JWT |
| POST | `/account/signup` | none | Register a new user |
| GET | `/account` | user | Get current user profile |
| GET | `/account/refresh` | none | Refresh access token (uses HttpOnly cookie) |
| GET | `/account/refresh/:token` | none | Refresh via token param |
| POST | `/account/reset` | none | Request password reset email |
| POST | `/account/reset-confirm` | none | Confirm password reset |
| POST | `/account/logout-all` | user | Revoke all refresh tokens |
| DELETE | `/account` | user | Delete own account |

## Products

Read endpoints are public. Write endpoints require admin.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/products` | none | List products |
| POST | `/products/search` | none | Search with filters |
| GET | `/products/:id` | none | Single product detail |
| POST | `/products` | admin | Create product |
| PUT | `/products` | admin | Bulk update products |
| PUT | `/products/:id` | admin | Update single product |
| DELETE | `/products` | admin | Bulk delete products |
| DELETE | `/products/:id` | admin | Delete single product |

## Cart

Per-user. Items are scoped to the authenticated user.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/cart` | user | Get current cart |
| GET | `/cart/summary` | user | Cart totals |
| POST | `/cart` | user | Add item to cart |
| PUT | `/cart/:productId` | user | Update item quantity |
| DELETE | `/cart/:productId` | user | Remove item from cart |
| DELETE | `/cart` | user | Clear entire cart |
| POST | `/cart/checkout` | user | Checkout → create order |

## Orders

Regular users see only their own orders. Admins can write to any order.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/orders` | user | List own orders |
| POST | `/orders/search` | user | Search own orders |
| GET | `/orders/:id` | user | Single order detail |
| GET | `/orders/:id/invoice` | user | Download invoice PDF |
| POST | `/orders` | admin | Create order manually |
| PUT | `/orders` | admin | Bulk update orders |
| PUT | `/orders/:id` | admin | Update single order |
| DELETE | `/orders` | admin | Bulk delete orders |
| DELETE | `/orders/:id` | admin | Delete single order |

## Users (admin)

Full user management. Self-service actions (`GET /account`, `DELETE /account`) live under `/account`.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| GET | `/users` | admin | List all users |
| POST | `/users/search` | admin | Search users |
| GET | `/users/:id` | admin | Single user detail |
| POST | `/users` | admin | Create user |
| PUT | `/users` | admin | Bulk update users |
| PUT | `/users/:id` | admin | Update single user |
| DELETE | `/users` | admin | Bulk delete users |
| DELETE | `/users/:id` | admin | Delete single user |

## Feedback

Contact form submissions from any visitor.

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| POST | `/feedback/contact` | none | Submit a contact form |
| GET | `/feedback` | admin | List all feedback |
| PUT | `/feedback/:id` | admin | Update feedback status |

## WebSocket

Real-time chat. The FE connects via the `createChatClient` utility. See [Realtime](../tools/websockets.md) for the full message contract.

**Connection:** `ws://<host>/ws/chat` (or value of `VITE_API_WEBSOCKET`)

**Client → Server**

| `type` | Payload | When |
| ------ | ------- | ---- |
| `chat:join` | `{ username: string }` | First message after connect |
| `chat:message:send` | `{ message: string }` | Send a message |

**Server → Client**

| `type` | Payload | When |
| ------ | ------- | ---- |
| `chat:joined` | `{ username, room }` | Confirmation to the joining client |
| `chat:message` | `{ id, username, room, message, timestamp }` | Broadcast to all clients |
| `chat:system` | `{ room, message, timestamp }` | Join / leave announcements |
| `chat:presence` | `{ room, users: string[] }` | User list after any join or disconnect |
| `chat:error` | `{ message }` | Validation failure |

## Related pages

- [Observability Endpoints](./observability.md)
- [API overview](./index.md)
- [OpenAPI Workflow](./openapi-workflow.md)
- [Realtime](../tools/websockets.md)
