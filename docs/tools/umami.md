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
    API[API request] --> Backend[Backend handler] -->|"custom events"| Umami
```

The shape is the point: this app _injects_ the tracker and nothing else. Pageviews are the
tracker's job rather than the router's, and every custom event arrives at the same Umami website
from the other side of the API.

## Consent

Umami waits for the visitor, the same private-by-default rule as the backend's
`NODE_ANALYTICS_REQUIRE_CONSENT`.

| Moment                        | What happens                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| Boot, no answer yet           | No tag injected; `localStorage['umami.disabled']` set; the banner shows                    |
| Guest accepts                 | `analyticsConsent` cookie = `granted`, tag injected, opt-out lifted                        |
| Guest declines / withdraws    | Cookie = `denied`, `umami.disabled` set, the tag (if loaded) goes silent                   |
| Signed in, profile loaded     | The account's own `analyticsConsent` rules, over the guest cookie                          |
| Logout / account deletion     | `identify` is reset and the guest cookie's answer applies again                            |
| Footer "Privacy choices" link | Reopens the banner for any visitor, so withdrawing is as easy as agreeing (GDPR Art. 7(3)) |

The banner and the link show whenever Umami is configured (`VITE_UMAMI_WEBSITE_ID`); there is no
separate flag. `VITE_UMAMI_REQUIRE_CONSENT=false` makes the tracker load unasked, for a deployer
with their own legal basis. That also makes the banner's promise untrue, so change its copy too.

The tag sends the page URL, the full referrer, screen size and language, and for a signed-in,
consenting user the account id (`identify`). The backend writes into the same Umami website, so a
consenting user's pageviews and events join under that id. The shipped Umami v2.14 cannot meet
CNIL's audience-measurement exemption, so consent is the basis, not an exemption.

## Why the frontend emits no events

Not one. The backend emits every product event — a product view, a cart change, a completed
checkout, a logout — from the request that performed it, where the data is authoritative and where
an extension cannot block it, a closing tab cannot lose it and a console cannot forge it.

That leaves the frontend nothing to add. Its pageviews are written by the tag itself; its errors,
web vitals and fetch spans go to [Faro](./observability.md). There is no `track()` on the store,
because there was nothing left for it to send.

Emitting the same event from both sides would double-count it, and letting the frontend own the
canonical version would make the analytics depend on whether a tracker script loaded.

## External references

- [Umami tracker configuration](https://umami.is/docs/tracker-configuration)
- [Umami custom events](https://umami.is/docs/track-events)

## Related pages

- [Observability](./observability.md) — the complete reference
- [Request Flow](../theory/request-flow.md)
