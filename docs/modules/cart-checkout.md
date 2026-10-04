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

## The seven refusals, and why they are shaped differently

| Answer    | What happened                                                                                   | What the screen does                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `409`     | Another checkout won the race — the cart's lines are on someone else's order                    | Refetch the cart and say it has changed. **Not a retry** — re-sending would find an empty cart.                                                  |
| `409`     | One or more lines are short on stock (`CART_INSUFFICIENT_STOCK`)                                | Name the short lines. The server sends one entry per line with what was requested, never the number left, so the basket is fixed in one pass.    |
| `409`     | The chosen method cannot carry the basket's real weight (`CART_SHIPPING_METHOD_WEIGHT`)         | Clear the chosen method and say why — the client's own weight is advisory; this is the server's enforced check.                                  |
| `404`     | One or more lines' products left the catalogue (`CART_PRODUCT_UNAVAILABLE`)                     | Name the lines — `title` absent for a hard-deleted product, since there is nothing left to read one off.                                         |
| `404`     | The address or the shipping method named no longer exists                                       | Reopen that step rather than failing the whole flow.                                                                                             |
| `422`     | The resolved address's country isn't on the ship-to list (`CART_SHIP_TO_COUNTRY_NOT_SUPPORTED`) | Say so — the country select already narrows a NEW address to the list, so the fix is picking or adding one, not a field this screen can correct. |
| transport | The request never reached the API                                                               | Show the generic checkout error. The `Idempotency-Key` is kept, so a retry is the same attempt.                                                  |

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
