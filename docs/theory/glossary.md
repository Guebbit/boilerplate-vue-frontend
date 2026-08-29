# Glossary

The terms each module uses, **defined as that module means them**.

This is deliberately not one flat list. The same word legitimately means different things in two
modules, and that divergence is the whole point of a bounded context — a `Cart` here is a view of
the server's cart, and the word means something else entirely in the paired backend, which owns
the row.

::: tip Where the language actually lives
In the code. The identifiers **are** the ubiquitous language, and they are what a change has to
move. This page carries the part an identifier cannot: what the term means, and the constraint
behind it.
:::

Many of these definitions say what this client does **not** own. That is the most useful thing a
frontend glossary can record: most of this application's domain lives behind the API, and the terms
below mark the boundary. See [Strategic DDD](./strategic-ddd.md) and
[Domain Layer](./domain-layer.md).

---

## `account`

| Term                 | What it means here                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Profile**          | The visitor’s own editable record. The same row `users` administers, seen from the inside.                                                   |
| **Session**          | Whether someone is signed in. Owned by `infrastructure/session`, not by this module — the router guards read it before any domain code runs. |
| **Account deletion** | A two-step exit: a request, then a confirm. Never one click.                                                                                 |

## `admin`

| Term          | What it means here                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **KPI**       | One headline number on the console. Read from the observability endpoints, never computed here. |
| **Audit log** | The server’s record of who did what. This module renders it and owns none of it.                |
| **Health**    | Whether the API can serve. A liveness answer, not a correctness one.                            |

## `cart`

| Term          | What it means here                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Cart**      | A VIEW of the server’s cart, not a second copy of it. Every mutation is a request; the store holds the answer.          |
| **Cart line** | A product and a quantity, as the API returns them. Prices come down with the response — this client never computes one. |
| **Checkout**  | The flow that turns the cart into an order: address, shipping, payment. The steps are this module’s; the rules are not. |
| **Badge**     | The header’s item count. The reason siblings refresh this store after writing to it.                                    |

## `delivery`

| Term                | What it means here                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **Shipping method** | A named way to ship, with a price the server quotes. Chosen in the cart, frozen on the order.     |
| **Shipment**        | The parcel panel on an order that has shipped. Read-only here — the courier is faked server-side. |

## `demo`

| Term           | What it means here                                                            |
| -------------- | ----------------------------------------------------------------------------- |
| **Counter**    | A number with no meaning, incremented to prove a store survives a navigation. |
| **Playground** | The page where the shared building blocks are shown, not used.                |

## `feedback`

| Term                | What it means here                                                          |
| ------------------- | --------------------------------------------------------------------------- |
| **Contact request** | A message from anyone, account or not. Identified by the email on the form. |
| **Inbox**           | The admin side of the same collection. Triage, nothing more.                |

## `inventory`

| Term                | What it means here                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stock movement**  | One row explaining a change in stock: how many, and why. Written by the server, listed here.                                                                   |
| **Inventory level** | What is on the shelf for one product right now: on hand, reserved, and the difference a shopper can actually buy.                                              |
| **Receipt**         | Stock arriving. Raises what is on hand and nothing else, so a delivery is sellable the moment it lands.                                                        |
| **Adjustment**      | A stocktake correction, signed — shrinkage is the common case and it is negative. Refused when it would leave fewer units than are already promised to orders. |

## `locales`

| Term         | What it means here                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Language** | A tag registered in the dynamic tier. Its existence means entries can be translated into it — never that the API can answer in it, which needs a deployed file.            |
| **Entry**    | One translated string, identified by (language, scope, key). Flat and dotted; the nested tree is built by the server.                                                      |
| **Scope**    | Which of the two dictionaries a row overrides. `app` is this frontend’s words, `api` is the backend’s. Separate keyspaces — the same key in both is two unrelated strings. |
| **Revision** | A language’s version counter, bumped by every write. What a client caches against.                                                                                         |

## `orders`

| Term        | What it means here                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Order**   | What a customer bought, frozen. This client renders it and never edits its substance — only an admin moves its status.     |
| **Status**  | Where an order is in its lifecycle. A closed set the server enforces; this module maps each value to a label and a colour. |
| **Reorder** | Refilling the cart from a past order. The one write this module makes into another module’s state.                         |

## `payments`

| Term         | What it means here                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **Payment**  | The money behind one order. A panel on the order page, never a page of its own.                  |
| **Provider** | The outside system that actually charges. Faked here, behind the same seam a real one would use. |

## `products`

| Term          | What it means here                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| **Product**   | A sellable item as the API returns it. Identified by id; the name is not unique.                              |
| **Catalogue** | The list view, with its filters and paging. The filters are query parameters — the server does the filtering. |
| **Stock**     | Units on the shelf, read from the response. This client displays availability and never decides it.           |

## `realtime`

| Term       | What it means here                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------- |
| **Stream** | The live SSE feed of observability metrics. Opened by this module, transported by `infrastructure`. |
| **Frame**  | One message off the stream, shown raw so the shape is visible rather than described.                |

## `users`

| Term            | What it means here                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **User**        | The person record, admin-facing. The same row `account` edits from the inside.                                              |
| **Admin**       | A flag on the User, not a role table. Two levels of access is the whole model.                                              |
| **Field rules** | The Zod schemas every user-shaped form validates against. This module’s one export, and the reason `account` depends on it. |

## `wishlist`

| Term             | What it means here                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **Wishlist**     | The visitor’s saved products. Holds references and nothing else — no quantity, no price. |
| **Move to cart** | The list’s only exit: a saved line becomes a cart line and leaves the list.              |
