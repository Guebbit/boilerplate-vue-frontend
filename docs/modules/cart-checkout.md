# The checkout flow

The only multi-step flow this client holds, and the one screen where price, stock, address and
shipping have to agree at once.

::: tip At a glance
**Mounts** — `ShippingSelector`, from [`delivery`](./delivery.md), and learns nothing from it.
**Decides** — nothing. Every total, every refusal and every price comes back from the server.
**Breaks if you change** — the error handling. Four of the five failure modes are the server's, not the client's.
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
    A["the cart screen<br/><i>lines, from the store</i>"] --> B["pick an address<br/><i>account's saved book</i>"]
    B --> C["pick a shipping method<br/><i>ShippingSelector, mounted</i>"]
    C --> D["POST /cart/checkout"]
    D --> E["store replaces the cart<br/><i>with the empty one</i>"]
    E --> F["route to the new order"]

    D -.->|"409 · someone else<br/>checked out first"| G["refetch and say so"]
    D -.->|"409 · lines short<br/>on stock"| H["name the short lines"]
    D -.->|"404 · address or<br/>method gone"| I["reopen that step"]
    D -.->|"transport failed"| J["CHECKOUT_REQUEST_FAILED"]

    classDef ui fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef call fill:#ede9fe,stroke:#7c3aed,color:#111827;
    classDef bad fill:#fee2e2,stroke:#b91c1c,color:#111827;
    class A,B,C,E,F ui;
    class D call;
    class G,H,I,J bad;
```

## The mounted selector

`ShippingSelector` comes from [`delivery`](./delivery.md) through its barrel. This module passes it
nothing but a binding for the chosen method id, and reads nothing back but that id.

::: tip Why that is the strongest edge on the map
This module never learns what a shipping rate is, how many methods exist, or how one is priced. The
component fetches its own methods and renders its own copy. Delete
[`delivery`](./delivery.md) and this screen loses a step; it does not break.

`published-language` is the label, and this is what it looks like in practice: vocabulary crossing
the boundary, not state.
:::

## The four refusals, and why they are shaped differently

| Answer    | What happened                                                                | What the screen does                                                                                                                         |
| --------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `409`     | Another checkout won the race — the cart's lines are on someone else's order | Refetch the cart and say it has changed. **Not a retry** — re-sending would find an empty cart.                                              |
| `409`     | One or more lines are short on stock (`CART_INSUFFICIENT_STOCK`)             | Name the short lines. The server sends one entry per line with what was requested and what is available, so the basket is fixed in one pass. |
| `404`     | The address or the shipping method named no longer exists                    | Reopen that step rather than failing the whole flow.                                                                                         |
| transport | The request never reached the API                                            | The one thing the server cannot report, so this client reports it.                                                                           |

::: warning The stock refusal is a list, and rendering it as one message throws away the useful half
`errors[0].details.lines` carries `productId`, `title`, `requested` and `available` per short line.
Collapsing that into "some items are unavailable" turns a one-pass fix into a guessing game.
:::

## The one analytics event this module owns

`CHECKOUT_REQUEST_FAILED` is emitted here, and it is the only checkout event this client reports.
Every other one — `checkout_completed`, `checkout_failed` — is emitted by the backend.

::: tip Why the split is that lopsided
Both repositories write into one Umami website, and **each name has exactly one emitter**. Anything
with an API call behind it is reported by the server, where it cannot be blocked by an extension,
lost with the tab, or forged from a console.

What is left for the client is what no request can carry — and a checkout that never reached the API
is precisely that.
:::

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
