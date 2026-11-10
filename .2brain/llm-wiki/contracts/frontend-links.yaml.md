---
source: contracts/frontend-links.yaml
sha256: b134ffd608034b81f650d3f3d4e8a580eb56accdd68ef3d499b3dedfca01e3f1
signature: b134ffd608034b81f650d3f3d4e8a580eb56accdd68ef3d499b3dedfca01e3f1
generated_at: 2026-11-10T02:11:01.122056+00:00
model: ollama:qwen3.8:27b
---

# contracts/frontend-links.yaml

## Purpose

Single source of truth for every URL path the backend embeds in mail, sitemap, and work-notice links under the frontend's `/<locale>/` root. It exists so the frontend receives the same list (`sync:frontend`) and its tests can walk the router against it, guaranteeing a backend-emitted link never lands on a 404 in the reader's inbox.

## Key elements

- **`links`** – Transactional / account paths the backend substitutes `{token}` or `{id}` into. Tokens ride in the URL *fragment* (`#token=…`, RFC 3986 §3.5) so the browser never transmits them to a server. Each entry can be overridden by an env var (names stay per-backend). Includes `verify`, `reset`, `setup`, `restore`, `emailChange`, `emailUndo`, `export`, `order`, `product`, `contact`, `privacy`, `terms`.
- **`staticPages`** – Public pages that take no dynamic id (`''` for home, `about`, `faq`, `terms`, `privacy`, `legal`, `contact`, `products`). Used for sitemap generation.
- **`staffPages`** – Paths that work-notice mails point staff at. `{id}` is filled by the backend. **Not** env-overridable; the code-to-screen mapping lives in the notifications module. The ten `*` summary rows (`transfersDue`, `preordersLate`, `deliveryHoldsOpen`, etc.) encode the exact query-string keys the corresponding list page reads from its own URL state, shared by both the in-app bell and the digest mail so they cannot drift.

## Relationships

- **contracts/authorization-keys.yaml** – Both files sit in the `contracts/` directory and jointly define the backend→frontend surface for auth flows. The `{token}` placeholder that appears throughout this file's `links` entries is the value whose structure / key names are governed by the authorization-keys contract; the backend fills it before the link is rendered.

## Notes

- Tokens are deliberately placed in the fragment (`#token=…`), not the query string, so they never appear in `Referer` headers or server access logs.
- `links` entries are env-overridable; `staffPages` entries are deliberately not — the mapping is a code concern of the notifications module, not a deployment choice.
- The `setup` link reuses the same token + endpoint semantics as `reset` but points to its own page (`account-setup` vs `password-reset/confirm`).
- `contact` is pre-filled with `?category=account` to satisfy GDPR Art. 22(3) (human review of a purchase hold).
- The file is consumed by frontend tests that assert every path here has a matching route; adding a link without a router entry will fail CI.
