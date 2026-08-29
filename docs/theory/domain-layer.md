# Domain layer & DDD

Two things, in order:

1. **`domain/`** — the folder, the rule, and where a piece of logic goes.
2. **DDD** — what it actually is, and why it is _not_ the same as this architecture.

Sections 2–5 mirror the API repo's page of the same name. Section 1 is where the two differ, because
a frontend has far less to put in this folder.

---

## 1. The folder

> **A rule the UI needs _before_ it calls the API goes in `src/modules/<name>/domain/`**, as a
> function that takes data and returns a value.

### Why it is thin here — and why that is correct

Prices, totals, checkout eligibility and permissions are decided by the API. Restating them on the
client gives you two implementations of one rule, drifting apart — the exact failure
`scripts/spec-identity.ts` exists to catch across these two repos.

**A thin domain layer on the client means the boundary is right, not that something is missing.**

### Where does this go?

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 30, 'rankSpacing': 40}}}%%
flowchart TD
    Q{"Does the API<br/>decide this?"}
    Q -->|yes| API["read the response<br/><i>never re-implement</i>"]
    Q -->|no| Q2{"Does it need Vue,<br/>the store, or i18n?"}
    Q2 -->|yes| OUT["not a domain rule"]
    Q2 -->|no| DOM["domain/ ✅"]

    OUT --> R1["fetching, loading flags → store.ts"]
    OUT --> R2["form validation + messages → schemas.ts"]
    OUT --> R3["number/date formatting → infrastructure/utils/formatters"]
    OUT --> R4["route access → app/guards"]

    classDef ask fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef yes fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef no fill:#fef3c7,stroke:#d97706,color:#111827;
    class Q,Q2 ask;
    class DOM yes;
    class API,OUT,R1,R2,R3,R4 no;
```

### The worked example

```ts
// modules/cart/domain/quantity.ts
export const MIN_LINE_QUANTITY = 1;
export const steppedQuantity = (quantity: number, step: number) =>
    Math.max(MIN_LINE_QUANTITY, quantity + step);
```

A line cannot reach zero by stepping — zero is not a quantity, it is a removal, which is a different
call with a different confirmation. That is a rule, not a template detail, and it is testable
without mounting a component.

The clamp is the reason this is a rule rather than a template detail. `:disabled` already stops a
decrement at 1, so `Math.max` looks redundant — it is not: a double click fires twice before Vue
re-renders `:disabled`, and the second one would send `quantity: 0` to an endpoint that reads it as
"remove". Someone tidying the template would delete that guard as dead code and reopen the bug,
which is exactly the kind of trap that earns a name.

A companion that did **not** earn one: `canDecrement(q) => q > MIN_LINE_QUANTITY` used to sit here,
and is now `:disabled="item.quantity <= MIN_LINE_QUANTITY"` in the template. One caller, no trap —
see [the floor](#the-floor-testable-without-mounting-a-component-is-necessary-not-sufficient).

### The rule, enforced by lint

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 35, 'rankSpacing': 45}}}%%
flowchart LR
    V["views/"] --> ST["store.ts"]
    V --> D["domain/"]
    ST --> API["generated API client"]
    D -.->|"❌ never"| ST
    D -.->|"❌ never"| API

    classDef pure fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef normal fill:#dbeafe,stroke:#2563eb,color:#111827;
    class D pure;
    class V,ST,API normal;
```

**The arrow points inward only.** `domain/` may not import:

| Forbidden                                                   | Why                                          |
| ----------------------------------------------------------- | -------------------------------------------- |
| `vue`                                                       | a rule may not know it is rendered           |
| `pinia`                                                     | a rule may not hold state                    |
| `axios`                                                     | a rule decides; the store fetches            |
| `vue-router`, `vue-i18n`                                    | routes and copy are delivery concerns        |
| `@/infrastructure/**`, `@/kernel/**`, `@/app/**`, `@/ui/**` | those are tiers; domain sits below them      |
| `@/modules/**`                                              | a sibling's rules are its own                |
| `../*` — its own module's outer files                       | domain may not read `../store` or `../views` |

### Is this standard?

Yes — a framework-free innermost layer is one of the most agreed-on ideas in software
architecture. Four traditions describe the same ring under four names:

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 30, 'rankSpacing': 35}}}%%
flowchart TD
    O["<b>outside</b><br/>the API · the browser · the router"]
    A["<b>application</b><br/>views/ · store.ts · composables"]
    D["<b>the rules</b><br/>domain/"]

    O -->|"may import"| A
    A -->|"may import"| D
    D -.->|"❌ never"| A
    D -.->|"❌ never"| O

    classDef out fill:#fee2e2,stroke:#dc2626,color:#111827;
    classDef app fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef pure fill:#dcfce7,stroke:#16a34a,color:#111827;
    class O out;
    class A app;
    class D pure;
```

| Tradition                        | Year | Author            | What it calls the innermost ring |
| -------------------------------- | ---- | ----------------- | -------------------------------- |
| **DDD**, layered architecture    | 2003 | Eric Evans        | the **domain layer**             |
| **Hexagonal** (Ports & Adapters) | 2005 | Alistair Cockburn | the inside, behind ports         |
| **Onion Architecture**           | 2008 | Jeffrey Palermo   | Domain Model + Domain Services   |
| **Clean Architecture**           | 2012 | Robert C. Martin  | Entities, then Use Cases         |

All four state the same rule: the rules do not import the delivery mechanism, and the dependency
arrow points inward only. `domain/` is the DDD spelling, which is why the folder carries that name.

**Lint is how the boundary is enforced, not why it exists.** The block in `eslint.config.ts` points
at `src/modules/*/domain/**` because ESLint matches on paths — a folder is simply the only thing a
linter can aim at. The folder's purpose is a rule you can test in milliseconds without mounting
anything; the linter is what stops that from decaying the first time someone reaches for the store
from inside a rule.

**On a frontend, be honest about the size of the prize.** The API decides prices, totals and
eligibility, so this layer is thin here by design and always will be — see
[Why it is thin here](#why-it-is-thin-here-—-and-why-that-is-correct). The backend repo's
`orders/domain/totals.ts` is property-tested over 3,900 generated baskets with no database; nothing
on this side will ever be that dramatic. What it buys here is smaller and still real: a rule the
template cannot silently delete, testable without mounting a component.

**When you would not have one at all:** most modules here have none, and that is the expected
state. See the floor below for the test a rule must pass before it earns a place.

### The floor: "testable without mounting a component" is necessary, not sufficient

The question above decides _where_ a rule goes. It does not decide _whether_ there is a rule. A
one-line expression passes "testable without mounting a component" trivially, so the test alone
would pull every ternary in the codebase into `domain/`.

> **A rule earns `domain/` when it has more than one caller, _or_ a non-obvious failure mode a
> reader would otherwise reintroduce. A one-line expression with one caller and no trap is
> inlined, and its comment goes with it.**

The comment is the part worth keeping. `:disabled="item.quantity <= MIN_LINE_QUANTITY"` says
everything `canDecrement(item.quantity)` said, minus an import, a barrel line and a hop.

Both halves are live:

| Kept              | Why it clears the floor                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| `steppedQuantity` | One caller, but a real trap: the clamp catches a double click outrunning `:disabled` |

| Removed        | Why it did not                                |
| -------------- | --------------------------------------------- |
| `canDecrement` | `q > MIN_LINE_QUANTITY`, one template binding |

The same floor is applied on the API side, where it removed `nextDeletionState` and `readScope`.

### The folder is optional

Only `cart` has one. On a frontend most modules never will.

Worth noting: `canAccess()` in `app/guards/authentications.ts` is already exactly this pattern
— a pure function, requirement in, boolean out. It stays in `app/` because it is a rule about _this
application's route tree_, not about one domain.

---

## 2. What DDD is

**Domain-Driven Design** (Eric Evans, 2003) is a way of _modelling a business in code_. It has two
halves, and almost everyone means the second when they say "DDD".

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 30, 'rankSpacing': 40}}}%%
flowchart TD
    DDD["DDD"]
    DDD --> ST["<b>Strategic</b><br/>how you carve the system up"]
    DDD --> TA["<b>Tactical</b><br/>how you model inside one piece"]

    ST --> S1["bounded contexts"]
    ST --> S2["ubiquitous language"]
    ST --> S3["context mapping"]
    ST --> S4["core vs generic subdomains"]

    TA --> T1["entities"]
    TA --> T2["value objects"]
    TA --> T3["aggregates"]
    TA --> T4["domain repositories"]

    classDef have fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef lack fill:#fee2e2,stroke:#dc2626,color:#111827;
    classDef neutral fill:#dbeafe,stroke:#2563eb,color:#111827;
    class ST,S1,S2,S3,S4 have;
    class TA,T1,T2,T3,T4 lack;
    class DDD neutral;
```

**Green = this repo has it. Red = it does not.**

---

## 3. DDD vs feature/domain architecture

These are not the same thing, and conflating them is the usual reason "we do DDD" means "we have
folders named after features".

**Feature architecture is a _packaging_ decision.** Where do files live?

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 25, 'rankSpacing': 35}}}%%
flowchart LR
    subgraph BY_LAYER["❌ package by layer"]
        direction TB
        L1["stores/<br/>products · orders · cart"]
        L2["views/<br/>products · orders · cart"]
        L3["routes/<br/>products · orders · cart"]
    end

    subgraph BY_FEATURE["✅ package by feature"]
        direction TB
        F1["products/<br/>store · views · routes"]
        F2["orders/<br/>store · views · routes"]
        F3["cart/<br/>store · views · routes"]
    end

    classDef bad fill:#fee2e2,stroke:#dc2626,color:#111827;
    classDef good fill:#dcfce7,stroke:#16a34a,color:#111827;
    class L1,L2,L3 bad;
    class F1,F2,F3 good;
```

Deleting a feature becomes one folder instead of three edits. **This repo does this, and it is
done.**

**DDD is a _modelling_ decision.** What do the files contain?

|             | Feature architecture           | DDD (tactical)                |
| ----------- | ------------------------------ | ----------------------------- |
| Answers     | _where does this file live?_   | _how is this rule expressed?_ |
| Unit        | a folder                       | an aggregate                  |
| Deliverable | a directory tree               | a model of the business       |
| Alone?      | yes — and this repo largely is | yes, in any tree shape        |

**You can have immaculate feature folders and zero DDD.** That is roughly this repo's position, and
it is a good one — the usual failure is the reverse: elaborate tactical patterns inside a ball of mud.

A **bounded context** and a **feature folder** often end up being the same directory, which is why
people conflate them. But a bounded context is defined by _where one model and one language stop
being valid_, not by where you put files.

---

## 4. Where this repo stands

**Strategic DDD — adopted, most of it machine-checked, none of it a claim about intent.** See
[Strategic DDD](./strategic-ddd.md) for what each one enforces, what it refuses, and — for context
map and subdomain distillation — why the enforcement moved off a manifest field.

| Concept                | Where                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Bounded context        | one folder per module; `rm -rf` deletes the domain                                                                    |
| Published language     | the module barrel, `index.ts` — and a spec forbids widening it past what a sibling imports                            |
| Context map            | prose in each `module.ts`'s docblock, next to its imports; which siblings it may reach is a generated ESLint rule     |
| Ubiquitous language    | the code's own identifiers, per context — and often deliberately different from the server's word for the same thing  |
| Subdomain distillation | prose in each `module.ts`'s docblock; a `generic` module carrying a `domain/` folder is a review question, not a spec |
| Domain service         | `cart/domain/quantity.ts`                                                                                             |

**Tactical DDD — absent, and mostly correctly so:**

| Concept        | Today                                              |
| -------------- | -------------------------------------------------- |
| Entity         | none — stores hold API-shaped data                 |
| Value object   | none                                               |
| Aggregate root | none                                               |
| Repository     | none — the generated API client is called directly |

On a client backed by an API, that list being empty is the expected answer, not a shortfall.

---

## 5. Should you go further?

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 30, 'rankSpacing': 40}}}%%
flowchart TD
    Q{"Does the CLIENT own<br/>rules the server does not?"}
    Q -->|"no — screens over an API"| A["thin domain/<br/>✅ what this repo ships"]
    Q -->|"yes — offline-first,<br/>editor, pricing engine"| B["full tactical DDD<br/>in that module only"]

    classDef ask fill:#dbeafe,stroke:#2563eb,color:#111827;
    classDef cheap fill:#dcfce7,stroke:#16a34a,color:#111827;
    classDef costly fill:#fef3c7,stroke:#d97706,color:#111827;
    class Q ask;
    class A cheap;
    class B costly;
```

For an API-backed storefront or admin — which is what this boilerplate produces — the answer is the
left branch. Going right means maintaining a client model _and_ keeping it reconciled with the
server's.

`TACTICAL_DDD_PLAN.md` (workspace root, beside this repo) prices the right branch in full for the
backend, and says why this repo stays out of its scope.

## Related pages

- [Layers](./layers.md) — the folder map
- [Modules](./modules.md) — the tier rules and their naming
