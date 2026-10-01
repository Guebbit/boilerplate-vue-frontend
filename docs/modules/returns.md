# returns

::: tip At a glance
**Owns** — the customer's own returns (a returns form for faulty or wrong goods and part-orders),
the staff queue that approves and receives them, and the EU "withdraw from contract here" button.
**Depends on** — nothing. [`orders`](./orders.md) mounts its `WithdrawalPanel`.
**Breaks if you change** — the order page's withdrawal control and returns form.
:::

| Fact                    | This module                             |
| ----------------------- | --------------------------------------- |
| **Subdomain**           | `supporting`                            |
| **Screens**             | 2 — `ReturnsList` · `ReturnTarget`      |
| **Store**               | `returns`                               |
| **Menu entries**        | `ReturnsList`                           |
| **API calls**           | 6                                       |
| **Depends on**          | _nothing_                               |
| **Depended on by**      | [`orders`](./orders.md)                 |
| **Languages**           | `en` · `it`                             |
| **Publishes**           | `WithdrawalPanel`                       |
| **Backend counterpart** | `returns` in `boilerplate-node-backend` |

## The map

`orders` reaches this module through one `published-language` edge: its page mounts
`WithdrawalPanel`, so the order never calls a returns operation itself. A return links back to its
order by route name, guarded by `linkIfRouted`, so no edge points the other way.

```mermaid
flowchart LR
    orders["orders (Order.vue)"] -.->|mounts| panel["WithdrawalPanel"]
    panel --> form["ReturnRequestForm"]
    form --> store["returns store"]
    panel --> store
    list["ReturnsList"] --> store
    detail["Return"] --> store
    detail --> staff["ReturnStaffActions"]
    staff --> store
    store -->|"POST /returns · GET /returns · moves"| api[("backend returns")]
```

## The story

A withdrawal is a return whose reason is `withdrawal`, so there is no separate endpoint: the button
is `POST /returns`. What comes back depends on where the goods are, and the store reports which:

| Server answers | Meaning                                                             | `openReturn` resolves with     |
| -------------- | ------------------------------------------------------------------- | ------------------------------ |
| 201 + Location | the goods had shipped — a `Return` was written                      | `{ kind: 'return', created }`  |
| 200            | before dispatch — the order was cancelled and refunded, no `Return` | `{ kind: 'cancelled', order }` |

**The button is server-driven.** `WithdrawalPanel` shows it when `Order.actions.withdraw` is true and
prints `Order.actions.withdrawUntil`; it never counts the fourteen days. Clicking asks once more —
the directive wants a confirmation step — and the backend mails the acknowledgement with the date and
time. A withdrawal takes no reason and always the whole order. The panel also lists the returns
already opened on that order, so a customer sees what became of a withdrawal.

**The returns form is for everything else.** Once an order has shipped, `ReturnRequestForm` lets the
customer tick the lines that come back, set a quantity for each, pick a reason (defective, wrong item
or other — `withdrawal` is the button, not a choice here) and add a note. It sends only the ticked
lines, so part of an order can go back; the same product can be returned again until nothing is left.
What is left is arithmetic in `domain/returnable-lines.ts`: ordered less what every not-declined return on
the order holds, leaving out goods with no right of withdrawal. The server re-checks all of it (too
many, an excluded line, a closed window) and its message shows in the form. Staff then approve or
decline the return like any other.

**Staff moves come from `Return.actions`.** `ReturnStaffActions` renders approve, decline (with the
reason the customer is told) and receive (with an optional handling deduction) from the three
booleans, and re-implements none of the lifecycle. Receiving is step-up gated: the http layer prompts
for the password when the server answers `REAUTH_REQUIRED`.

```mermaid
stateDiagram-v2
    [*] --> approved: withdrawal
    [*] --> requested: any other reason
    requested --> approved: staff approve
    requested --> declined: staff decline
    approved --> received: goods arrive
    received --> closed: the money went back
```

**Goods with no right of withdrawal** (EU Art. 16) carry `noWithdrawal` on their order line; the order
page says so on the line, and the product form has the switch. The refusal itself is the backend's.

## Not built here

The return address the shop asks goods to be sent to is read from `GET /delivery/methods` and named in
the acknowledgement email; this module does not show it on the return page.
