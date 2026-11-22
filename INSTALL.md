# Install checklist

What this frontend needs from outside the code before it is yours: a domain, a certificate, a brand,
a legal review, a hands-on check. One line each; the linked page is the real guide. Nothing here
lists settings: `.env-example` is that list.

If you pair it with the Node backend, that repository has its own `INSTALL.md`.

## Required to run

- [ ] Where the API is, and the backend allowing this origin: [API and realtime](docs/operate/environment.md#api-and-realtime)
- [ ] TLS, HSTS and a Content-Security-Policy at the proxy in front: [TLS, HSTS and the CSP](docs/build/docker-and-podman.md#tls-hsts-and-the-csp)

## Make it yours

- [ ] Name, logo, favicons and the web manifest still say "Guebbit": [Branding](docs/operate/environment.md#branding)
- [ ] The licence holder, and the AGPL section 13 source offer (the app has no place to show the link): [License](README.md#license)
- [ ] `robots.txt`: none ships, add one if you want crawlers steered
- [ ] Replace `<LegalPlaceholder>` in `src/app/views/TermsPage.vue` and `PrivacyPage.vue` with your lawyer's text, in every language you sell in, written in the template (not in locale keys: the admin dictionary can change those at runtime). Use the placeholder's checklist as the list of sections to cover. Bump the backend's `NODE_TERMS_VERSION` in the same deploy. The cookies-and-storage table is generated: add only what it cannot know (a third party you added)
- [ ] The seller's name, address, VAT number and trade register come from the backend's `NODE_LEGAL_*` variables (set once there). They show in the footer, on Terms, on Privacy and on the Legal notice page

## Features, each off until you act

- [ ] Error and performance reporting: [Grafana Faro](docs/operate/observability.md#grafana-faro)
- [ ] Analytics, and a legal review of the consent banner's wording: [Umami consent](docs/operate/umami.md#consent)
- [ ] A disclosure contact at `/.well-known/security.txt`: [security.txt](docs/operate/environment.md#security-txt)

## Once per new project

- [ ] GitHub settings: [After you clone](docs/build/run-locally.md#after-you-clone-the-github-settings)
- [ ] What the workflows lean on (Actions opening PRs, GHCR, the paired backend's repo and token): [Workflow settings](docs/build/run-locally.md#workflow-settings)
