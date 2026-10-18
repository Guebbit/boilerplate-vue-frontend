# Install checklist

What this frontend needs from outside the code before it is yours: a domain, a certificate, a brand,
a legal review, a hands-on check. One line each; the linked page is the real guide. Nothing here
lists settings: `.env-example` is that list.

If you pair it with the Node backend, that repository has its own `INSTALL.md`.

## Required to run

- [ ] Where the API is, and the backend allowing this origin: [API and realtime](docs/tools/environment.md#api-and-realtime)
- [ ] TLS, HSTS and a Content-Security-Policy at the proxy in front: [TLS, HSTS and the CSP](docs/tools/docker-and-podman.md#tls-hsts-and-the-csp)

## Make it yours

- [ ] Name, logo, favicons and the web manifest still say "Guebbit": [Branding](docs/tools/environment.md#branding)
- [ ] The licence holder, and the AGPL section 13 source offer (the app has no place to show the link): [License](README.md#license)
- [ ] `robots.txt`: none ships, add one if you want crawlers steered
- [ ] Replace the legal placeholders (Terms, Privacy): `static-pages.terms` and `static-pages.privacy` in `src/locales/en.json` and `it.json`, or edit them at runtime from the admin dictionary. The Privacy page also needs its cookie section (the cookies and storage keys the app sets, and what each is for)
- [ ] The seller's name, address, VAT number and trade register shown in the footer, on Terms and on the Legal notice page come from the backend's `NODE_SHOP_*` variables (set once there)

## Features, each off until you act

- [ ] Error and performance reporting: [Grafana Faro](docs/tools/observability.md#grafana-faro)
- [ ] Analytics, and a legal review of the consent banner's wording: [Umami consent](docs/tools/umami.md#consent)
- [ ] A disclosure contact at `/.well-known/security.txt`: [security.txt](docs/tools/environment.md#security-txt)

## Once per new project

- [ ] GitHub settings: [After you clone](docs/getting-started.md#after-you-clone-the-github-settings)
- [ ] What the workflows lean on (Actions opening PRs, GHCR, the paired backend's repo and token): [Workflow settings](docs/getting-started.md#workflow-settings)
