# FE-2 frozen expectations — Orders & payments (actions, cancel, refund)

Blind read of Tier A spec only. Sources:
- `/home/andrea/Work/Guebbit/boilerplate-vue-frontend/openapi.yaml` (root bundle, verified byte-identical to backend)
- `/home/andrea/Work/Guebbit/boilerplate-node-backend-2/src/modules/orders/openapi.yaml` (module fragment, more prose than the root bundle carries)
- `/home/andrea/Work/Guebbit/boilerplate-node-backend-2/src/modules/payments/openapi.yaml` (module fragment)

No file under `src/` or any test file was opened before this commit.

## Orders — actions & cancel

- **E1** — Which statuses a caller may cancel from is decided by the server and exposed as `Order.actions.cancel: boolean`. The client renders controls from this rather than re-implementing the lifecycle, "the rules depend on the caller's role, and a second copy in a separately deployed client is how the two come to disagree." A client must NOT maintain its own list of cancellable statuses.
  Spec: `openapi.yaml:3408-3427` (`OrderActions`), `openapi.yaml:3415`.

- **E2** — A customer may cancel while the order is `pending` or `paid`. An operator (admin) can cancel one step further into the lifecycle (beyond the pending/paid pair) — the spec does not name the exact extra status, only "one step further."
  Spec: `openapi.yaml:2532`; `orders/openapi.yaml:274-276`.

- **E3** — `POST /orders/{id}/cancel` request body is optional (`requestBody.required: false`). `CancelOrderRequest.refund` defaults to `true` when the body (or the field) is omitted.
  Spec: `openapi.yaml:2538-2543`, `5785-5793`; `orders/openapi.yaml:288-293, 363-376`.

- **E4** — `refund` is an operator-only choice. For a non-admin (customer) caller it is ignored — the customer is always refunded and cannot waive it by sending `refund: false`. Only an admin/operator caller's `refund: false` should suppress the refund.
  Spec: `openapi.yaml:2532, 5788, 5793`; `orders/openapi.yaml:274-278, 367-368`.

- **E5** — Cancelling releases the order's held stock in every case, independent of the `refund` value.
  Spec: `openapi.yaml:2532`; `orders/openapi.yaml:276-277`.

- **E6** — A non-admin can cancel only their own orders; an admin can cancel anyone's order.
  Spec: `openapi.yaml:2532`; `orders/openapi.yaml:280`.

- **E7** — The eligibility check and the cancel write are one atomic statement; a cancel racing a concurrent status change resolves to exactly one winner.
  Spec: `openapi.yaml:2532`; `orders/openapi.yaml:280-282`.

- **E8** — `409` on cancel means the order exists and is visible to the caller but its status is already past the cancellable pair (`pending`, `paid`) — `errors[].code` is `ORDER_NOT_CANCELLABLE`.
  Spec: `orders/openapi.yaml:303-305`.

- **E9** — For a later-status order, a return must go through `PUT /orders/{id}`, not the cancel endpoint. Cancel is described as "the one order write a customer can make."
  Spec: `openapi.yaml:2532`; `orders/openapi.yaml:278-279`.

- **E10** — `OrderActions.transitions` is the array of statuses this caller may move the order to. It is empty on a terminal order and never contains the order's current status.
  Spec: `openapi.yaml:3417-3424`.

- **E11** — `OrderActions.pay` is a boolean that is deliberately NOT part of `transitions`, because no direct request moves an order to `paid` — that only happens via the payment confirm flow (`POST /payments/intent` then the provider's charge).
  Spec: `openapi.yaml:3428-3430`.

- **E12** — `OrderActions` requires all three fields (`transitions`, `cancel`, `pay`) to be present; `additionalProperties: false`. A client should treat all three as always-present, server-decided booleans/arrays, not optional or client-derived.
  Spec: `openapi.yaml:3408-3414`.

## Payments — actions, intent, confirm, refund

- **E13** — `PaymentActions.refund` tells the client whether `POST /payments/order/{orderId}/refund` would be accepted; it is `false` once the payment is refunded. This is meant to grey out the control rather than let the operator discover non-refundability by clicking (i.e., the client must trust this flag, not derive refundability itself from `Payment.status`).
  Spec: `openapi.yaml:5802-5815`.

- **E14** — `PaymentActions.pay` is true only when the payment is awaiting confirmation or retryable-after-decline AND the order can still reach `paid` — a compound, server-computed condition the client should not re-derive from `Payment.status` alone.
  Spec: `openapi.yaml:5810-5812`.

- **E15** — `PaymentActions` requires both `pay` and `refund`; `additionalProperties: false`.
  Spec: `openapi.yaml:5802-5807`.

- **E16** — `POST /payments/order/{orderId}/refund` is admin only (a `403 Forbidden` is a documented response) and returns the money without touching the order's status.
  Spec: `openapi.yaml:2651-2685`; `payments/openapi.yaml:65-96`.

- **E17** — The refund write is conditional on the payment still being `succeeded`; a double submit refunds once and answers `409` the second time — `errors[].code` is `PAYMENT_NOT_REFUNDABLE`.
  Spec: `openapi.yaml:2656`; `payments/openapi.yaml:92-93`.

- **E18** — `POST /payments/intent` freezes one of the caller's `pending` orders into a payment intent; the amount is taken from the order's own lines (cannot quote a different number). Calling it again for the same order refreshes/returns the same intent (one payment per order is a DB fact).
  Spec: `openapi.yaml:2593`.

- **E19** — `409` on `POST /payments/intent` means the order's money already moved (no longer `pending`) — `errors[].code` is `PAYMENT_ORDER_NOT_PAYABLE`.
  Spec: `payments/openapi.yaml:30-31`.

- **E20** — `GET /payments/order/{orderId}` returns `404` when there is no intent yet; this is a normal, expected outcome ("absence is an answer"), and the client's response is to start the flow with `POST /payments/intent`, not to treat it as an application error.
  Spec: `openapi.yaml:2625`.

- **E21** — `POST /payments/{id}/confirm`: the provider charges first, then the order is moved `pending → paid` by a conditional write; if the order slipped away in between, the charge is refunded on the spot automatically (client does not need to trigger a separate refund in that case). A decline answers `409` with `errors[].code` `PAYMENT_DECLINED` and is retryable — the client may submit the same payment again with a different card.
  Spec: `openapi.yaml:2691`; `payments/openapi.yaml:102, 123-125`.

- **E22** — Other `409` causes on confirm: `PAYMENT_NOT_CONFIRMABLE` (payment not awaiting confirmation) and `PAYMENT_ORDER_NOT_PAYABLE` (order slipped away, charge refunded on the spot).
  Spec: `payments/openapi.yaml:123-125`.

- **E23** — `ConfirmPaymentRequest.cardNumber`: digits and optional spaces, `minLength: 12`, `maxLength: 23`, pattern `^[\d ]+$`. The fake provider declines exactly `4000000000000002` and accepts everything else that matches the pattern; `4242424242424242` is only a documented conventional success card, not a specially-required one.
  Spec: `openapi.yaml:5881-5892`.

- **E24** — `Payment.status` enum: `requires_confirmation`, `succeeded`, `declined`, `refunded`. `declined` is retryable via the same confirm endpoint; `refunded` is terminal.
  Spec: `openapi.yaml:5842-5849`.

- **E25** — Error envelope on any failure: `{ success: false, status: number, message: string, errors: [{ code, message, details? }] }`, `errors` has `minItems: 1`. A correct client reads `errors[].code` to distinguish failure reasons (e.g. `ORDER_NOT_CANCELLABLE` vs `PAYMENT_DECLINED`), not just the HTTP status code, since several distinct causes share the same `409` status.
  Spec: `openapi.yaml:3172-3213`.
