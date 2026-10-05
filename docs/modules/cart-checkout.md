# The checkout flow

The only multi-step flow this client holds, and the one screen where price, stock, address and
shipping have to agree at once.

::: tip At a glance
**Mounts** — `ShippingSelector`, from [`delivery`](./delivery.md), and learns nothing from it.
**Decides** — nothing. Every total, every refusal and every price comes back from the server.
**Breaks if you change** — the error handling. Five of the six failure modes are the server's, not the client's.
:::

## What this client actually does

::: warning It does not price the cart
Line totals, shipping cost, availability and the final amount are all decided by
`POST /cart/checkout`. This screen collects three inputs, sends them, and renders the answer.

That is the whole reason [`cart`](./cart.md) is labelled `core` on a client where almost none of the
domain lives. The screens and the flow are load-bearing; the arithmetic is not here.
:::

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 30, 'rankSpacing': 44}}}%%
flowchart TD
    A["the cart screen<br/><i>lines, from the store</i>"] --> C["pick a shipping method<br/><i>ShippingSelector, mounted</i>"]
    C -->|"needs an address"| B["pick an address<br/><i>account's saved book</i>"]
    C -->|"no address needed"| S["settle<br/><i>flush any pending quantity step first</i>"]
    B --> S
    S --> D["POST /cart/checkout"]
    D --> E["store replaces the cart<br/><i>with the empty one</i>"]
    E --> F["route to the new order"]

    D -.->|"409 · someone else<br/>checked out first"| G["refetch and say so"]
    D -.->|"409 · lines short<br/>on stock"| H["name the short lines"]
    D -.->|"409 · method can't<br/>carry the weight"| K["clear the method<br/>and say why"]
    D -.->|"404 · a line's product<br/>left the catalogue"| L["name the lines"]
    D -.->|"404 · address or<br/>method gone"| I["reopen that step"]
    D -.->|"transport failed"| J["generic checkout error,<br/>same Idempotency-Key on retry"]

    classDef ui fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef call fill:#ede9fe,stroke:#7c3aed,color:#111827;
    classDef bad fill:#fee2e2,stroke:#b91c1c,color:#111827;
    class A,B,C,S,E,F ui;
    class D call;
    class G,H,I,J,K,L bad;
```

## The mounted selector

`ShippingSelector` comes from [`delivery`](./delivery.md) through its barrel. This module hands it
two derived NUMBERS — the lines total and the basket's weight — plus a binding for the chosen
method id, and reads nothing back but that id.

::: tip Why that is still the strongest edge on the map
This module never learns what a shipping rate is, how many methods exist, or how one is priced. The
component fetches its own methods, filtered by the weight it was handed, and renders its own copy.
Delete [`delivery`](./delivery.md) and this screen loses a step; it does not break.

`published-language` is the label, and this is what it looks like in practice: vocabulary crossing
the boundary — two numbers this screen already owns for its own totals — not domain state.
:::

## The refusals, and why they are shaped differently

| Answer                         | What happened                                                                                                 | What the screen does                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `409`                          | Another checkout won the race — the cart's lines are on someone else's order                                  | Refetch the cart and say it has changed. **Not a retry** — re-sending would find an empty cart.                                                                                                                                 |
| `409`                          | The total moved since the page showed it (`CART_TOTAL_CHANGED`): a price, shipping or the basket changed      | Read the cart again and say "The total changed from X to Y" from `details`. Stay on the cart, button live: the next press confirms the new total. See [the total the buyer was shown](./cart.md#the-total-the-buyer-was-shown). |
| `409`                          | One or more lines are short on stock (`CART_INSUFFICIENT_STOCK`)                                              | Name the short lines. The server sends one entry per line with what was requested, never the number left, so the basket is fixed in one pass.                                                                                   |
| `409`                          | The chosen method cannot carry the basket's real weight (`CART_SHIPPING_METHOD_WEIGHT`)                       | Clear the chosen method and say why — the client's own weight is advisory; this is the server's enforced check.                                                                                                                 |
| `404`                          | One or more lines' products left the catalogue (`CART_PRODUCT_UNAVAILABLE`)                                   | Name the lines — `title` absent for a hard-deleted product, since there is nothing left to read one off.                                                                                                                        |
| `409`                          | The cart is already empty (`CART_EMPTY`) — a lost order answer hid an order that exists                       | Say so, and read the cart again so the page stops offering a basket the server no longer holds.                                                                                                                                 |
| `409`                          | The first attempt is still running (`IDEMPOTENCY_IN_FLIGHT`)                                                  | The store asks again by itself after 1, 2 and 4 s under the same key, so the retry replays the order. If it is still running, say so and read the cart again.                                                                   |
| `500`                          | The server failed, and may or may not have written the order                                                  | Read the cart again: empty means the order exists (go to the orders), still full means nothing was written (the next press gets a new key).                                                                                     |
| `404`                          | The address or the shipping method named no longer exists                                                     | Reopen that step rather than failing the whole flow.                                                                                                                                                                            |
| `409`                          | The account already holds its limit of unpaid orders, whatever their payment method (`CART_OPEN_ORDER_LIMIT`) | Say so in plain words and link each unpaid order named in `details.orderIds`, so paying or cancelling one is a click away. The server's sentence is never shown: the copy is this screen's own.                                 |
| `422`                          | The resolved address's country isn't on the ship-to list (`CART_SHIP_TO_COUNTRY_NOT_SUPPORTED`)               | Say so — the country select already narrows a NEW address to the list, so the fix is picking or adding one, not a field this screen can correct.                                                                                |
| transport, `502`, `503`, `504` | The request never reached the API, or the gateway gave up                                                     | Show the generic checkout error. The `Idempotency-Key` is kept, so a retry is the same attempt. See [the checkout key](./cart.md#the-checkout-key).                                                                             |

::: warning Two of these are lists, and rendering either as one message throws away the useful half
`CART_INSUFFICIENT_STOCK`'s `errors[0].details.lines` carries `productId`, `title` and `requested` per
short line (the number left is for stock readers only). `CART_PRODUCT_UNAVAILABLE`'s carries `productId` and an optional
`title`. Collapsing either into "some items are unavailable" turns a one-pass fix into a guessing
game.
:::

## Analytics

This client emits no checkout event. Every one — `checkout_completed`, `checkout_failed` — is
reported by the backend handler that decided it, so each name has exactly one emitter and none can be
blocked by an extension, lost with the tab or forged from a console. A checkout that never reached
the API is visible as a failed request span in Faro instead.

## After a success

The store replaces the local cart with the authoritative payload the API answered, which for a
completed checkout is the empty one. That is what stops the header badge showing items the server has
already turned into an order — and it is why checkout lives in this store rather than in
[`orders`](./orders.md).

## Related pages

- [`cart`](./cart.md) — the module this belongs to
- [`delivery`](./delivery.md) — the component this flow mounts
- [`orders`](./orders.md) — where a completed checkout lands
- [Domain Layer](../theory/domain-layer.md) — why the totals are not computed here
- [Umami](../tools/umami.md) — the one event this module reports
