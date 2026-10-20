# Umami

The _why_. Every operational rule — the event taxonomy, the env vars, the code examples, the
architecture — lives in [Observability](./observability.md), and deliberately only there: this
page and that one used to restate the same rules, and the copies drifted until one of them
documented functions that no longer existed.

## Why Umami is here

Umami is the **product analytics** layer in this boilerplate. It answers "are users doing what we
expect?" from a product perspective, not an infrastructure one — the complement to Faro, which
answers "is the app healthy?".

It was chosen because it is **self-hosted and open-source**: no external SaaS account, no vendor
holding the data, and no cookies by default. Cookieless is not consent-free, though: the tracker is JavaScript that
makes the browser send information, which EDPB Guidelines 2/2023 puts inside ePrivacy Art. 5(3).
So the tracker loads only after the visitor accepts the banner (see
[Consent](#consent)). The same reasoning picked every other piece of the
observability stack here — the whole thing runs locally under Docker/Podman.

## Event flow

```mermaid
flowchart LR
    Boot[App bootstrap] --> Gate{Visitor consented?}
    Gate -->|yes| Store[useObservabilityStore\nsetUmamiConsent(true)]
    Gate -->|no| Off[umami.disabled set\nno tag injected]
    Store -.injects the tag.-> Umami[Umami tracker\noptional]
    Nav[Route change] -.automatic pageview.-> Umami
    API[API request] --> Backend[Backend handler] -->|"business events"| Umami
    Browse[Product page, search] -.after consent.-> Relay[POST /analytics/events] --> Backend
```

The shape is the point: this app _injects_ the tracker and nothing else. Pageviews are the
tracker's job rather than the router's, and every custom event arrives at the same Umami website
from the other side of the API (browsing ones relayed, after consent).

## Consent

Umami waits for the visitor, the same private-by-default rule as the backend's
`NODE_ANALYTICS_REQUIRE_CONSENT`.

| Moment                        | What happens                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Boot, no answer yet           | No tag injected; `localStorage['umami.disabled']` set; the banner shows                                                               |
| Guest accepts                 | `analyticsConsent` cookie = `granted`, tag injected, opt-out lifted                                                                   |
| Guest declines / withdraws    | Cookie = `denied`, `umami.disabled` set, the tag (if loaded) goes silent                                                              |
| Signed in, profile loaded     | The account's own `analyticsConsent` rules, over the guest cookie; the banner stays hidden while the account holds an answer          |
| Signed in, banner or link     | Its buttons write the account (`PATCH /account`), never the guest cookie                                                              |
| Logout / account deletion     | the guest cookie's answer applies again                                                                                               |
| Footer "Privacy choices" link | Reopens the banner for any visitor, so withdrawing is as easy as agreeing (GDPR Art. 7(3)); signed in, its answer goes to the account |

The banner and the link show whenever Umami (`VITE_UMAMI_WEBSITE_ID`) or Faro (`VITE_FARO_URL`) is
configured; there is no separate flag. Faro follows the same answer
(`setFaroConsent`): it is not loaded, so no crash report is sent, until the visitor agrees, and the banner says so. `VITE_UMAMI_REQUIRE_CONSENT=false` makes the tracker load unasked, for a deployer
with their own legal basis. That also makes the banner's promise untrue, so change its copy too.

The tag sends the page URL, the full referrer, screen size and language, and no account id: the
browser never calls `identify`. The backend writes into the same Umami website, and its own events do
carry the account id of a consenting signed-in caller. The shipped Umami v2.14 cannot meet
CNIL's audience-measurement exemption, so consent is the basis, not an exemption.

## Who sends which event

One rule: **browsing is sent by this app, business facts by the backend.**

The backend emits every business fact — a cart change, a completed checkout, an order, a logout —
from the request that performed it, where the data is authoritative and where an extension cannot
block it, a closing tab cannot lose it and a console cannot forge it.

Browsing is the exception, because the response cache (Redis, and the browser's own for searches)
answers most reads without reaching the backend, so it would under-count. A product page opened
and a search made are reported by the page through the backend's `POST /analytics/events` relay
(`trackBrowsing` on the consent store), and only after the visitor accepts: nothing is queued from
before that. The backend then emits them through its own consent gate. The exact event list is the
backend's contract, not copied here.

Its pageviews are written by the tag itself; its errors, web vitals and fetch spans go to
[Faro](./observability.md). There is no other `track()`.

Emitting the same event from both sides would double-count it, and letting the frontend own the
canonical version would make the analytics depend on whether a tracker script loaded.

## External references

- [Umami tracker configuration](https://umami.is/docs/tracker-configuration)
- [Umami custom events](https://umami.is/docs/track-events)

## Related pages

- [Observability](./observability.md) — the complete reference
- [Request Flow](../theory/request-flow.md)
