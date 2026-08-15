# Strategic DDD

**The part of Domain-Driven Design that survives on a client** — bounded contexts, context mapping,
ubiquitous language and subdomain distillation. All four are in the code, declared per module and
asserted by specs.

The other half — entities, value objects, aggregates, repositories — is **not** here, and on a
frontend that is more emphatic than a preference. [Domain layer](./domain-layer.md) explains why:
prices, totals, eligibility and permissions are decided server-side, and a client that
re-implements them has two implementations of one rule.

::: tip This page mirrors the backend's
`boilerplate-node-api-mongodb-mongoose/docs/theory/strategic-ddd.md` states the same four ideas for
the API. Read them together — the interesting parts are where the two **disagree**, and each of
those disagreements is a fact about where the domain actually lives.
:::

---

## The problem this solves

Every architecture document says things like "the cart owns checkout" and "admin depends on
nothing". Those sentences are true when written and unverifiable forever after. Six months later the
document says one thing, the imports say another, and the document is the one that loses — quietly,
because nothing fails.

This client had exactly that, twice, and both were found the day the checks went in:

- `cart` declared `dependsOn: ['orders']` long after checkout moved into the cart store and the
  import disappeared.
- `orders` published `useOrdersStore` "for the cart's checkout" — same vanished import, and the
  export outlived its reason by a whole refactor.

So each claim is now a **field on the manifest** with a **spec behind it**.

---

## 1. Bounded context — the folder

One module is one context. `rm -rf src/modules/wishlist` plus one line in `src/modules.ts` deletes
the domain, and anything that breaks is real coupling worth seeing. Covered in
[Modules](./modules.md).

## 2. Context map — typed edges

`dependsOn` is not a dependency list. It is a labelled graph:

```ts
dependsOn: [
    {
        module: 'payments',
        as: 'published-language',
        because: 'Mounts `PaymentPanel`; paying happens on the order page without this module knowing a provider exists.'
    }
];
```

Three kinds, because three is what this client actually has:

| Kind                 | What it means                                                    | Cost when the upstream changes                   | Example                |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | ---------------------- |
| `conformist`         | reads another module's store as it is, no translation, no say    | **high** — its shape is your shape too           | `inventory → products` |
| `customer-supplier`  | calls a sibling's store to make something happen                 | medium — the call survives, the payload may not  | `products → cart`      |
| `published-language` | receives vocabulary, not state: a schema, a self-contained component | **low** — neither side learns the other's store  | `orders → payments`    |

### The one that is missing

The backend has a fourth kind, `shared-kernel`, and exactly one edge that is one: `account → users`,
because both modules write the same User record.

**Here the same pair is `published-language`**, and that is the whole difference between the two
repos in one line. On the client, `account` and `users` share `usersSchema` and `usersPasswordSchema`
— field rules, so "what makes a valid username" is answered once for the person editing their own
record and the admin editing someone else's. Neither module writes anything; the API does. What they
share is **vocabulary**, and vocabulary is the cheap kind of sharing.

`contextMap.spec.ts` asserts no fourth kind appears. If one ever does, the client has started owning
state the server owns, which is the drift `scripts/specIdentity.ts` exists to catch elsewhere.

### What else the map is held to

- **no declared edge that nothing imports** — the `cart → orders` failure above.
- **no import that no edge declares.** ESLint stops a module reaching a sibling's _internals_;
  nothing until now stopped it reaching a sibling it never admitted to needing.
- **every edge has a reason a human wrote.**

`.vue` files are scanned alongside `.ts`, because on a client most cross-module reach happens in a
component. A sweep that read only TypeScript would miss most of the real graph.

## 3. Ubiquitous language — per context, not per app

Each module declares the terms it uses, defined **as it means them**. On a client this is worth more
than it first looks, because the client's word is frequently not the server's:

```ts
language: {
    Cart: 'A VIEW of the server’s cart, not a second copy of it. Every mutation is a request; the store holds the answer.';
}
```

The backend's `Cart` is "one open basket per user, priced against the live catalogue". Both are
right, in their own context, and a single shared glossary would have to pick one and be wrong in the
other place. Writing the client's definition down is also the cheapest guard there is against
someone deciding the store should compute a total.

## 4. Subdomain distillation — where to spend effort

| Subdomain    | Meaning                                                        | Here                                                    |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------- |
| `core`       | the reason the product exists — worth client-side rules        | `products`, `cart`, `orders`                            |
| `supporting` | specific to this business, not a differentiator — keep it plain | `delivery`, `payments`, `inventory`, `wishlist`         |
| `generic`    | a solved problem, interchangeable with something bought        | `account`, `users`, `admin`, `feedback`, `realtime`     |

The enforced rule: **a `generic` module may not carry a `domain/` folder.**

There is deliberately **no** rule that `core` must have one, and on a client that matters more than
on the server. `cart` has a `domain/` because quantity clamping is a genuine client-side rule.
`products` and `orders` are core and have none — prices and status transitions are the server's to
decide, and a second implementation here would be drift, not thoroughness.

::: warning A `core` label here marks screens, not logic
This application owns almost none of the domain it displays. `orders` is core because the order
history and the admin status screens are load-bearing, not because an invariant lives here. Nothing
in this table is an argument for building an aggregate.
:::

## 5. Published language — the barrel, held to a size

**A module publishes exactly what a sibling imports. No sibling, no barrel.**

Applying that removed three whole barrels — `admin`, `orders`, `realtime` — and four stores nobody
had ever imported.

What survived says something specific about a client. The modules that publish a **store** are the
ones siblings ask to change state: `cart` and `wishlist`. The ones that publish a **component** or a
**schema** are answering a narrower question, and are the better shape — `PaymentPanel` renders a
payment without its caller learning what a provider is. `delivery` publishes two components and
deliberately not its store, because offering both would mean offering a wider way to do the same
thing, and the wider one always wins.

---

## What this does not give you

Everything above is about **boundaries and vocabulary**. None of it makes an invalid order
unconstructable or turns `status: string` into a closed set — and on this side of the API, none of it
should. See [Domain layer](./domain-layer.md) §5 for when a client genuinely does own rules
(offline-first, a complex editor, a client-side pricing engine), and what changes if it does.
