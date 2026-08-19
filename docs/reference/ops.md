# Ops & Assets

Everything that is not application code: the images the app is built and served in, the CI that
gates it, the files it serves, and the docs site describing it.

---

## Images

A frontend's production image is not a Node process — it is a static bundle behind nginx, which is
why there are two web-server configs here and none in the paired backend.

| File | What it is | Read next |
|---|---|---|
| `.docker/Dockerfile` | The development image: the Vite dev server with the source bind-mounted. | [Docker & Podman](../tools/docker-and-podman.md) |
| `.docker/Dockerfile.production` | A multi-stage build — install, `vite build`, then copy the bundle into an nginx image. The toolchain does not ship. | [Docker & Podman](../tools/docker-and-podman.md) |
| `.docker/nginx.conf` | Serves the built app, and the part that matters: an SPA needs every unmatched path to fall back to `index.html`, or a deep link answers 404 from a router that never got to run. | [State & Routing](../tools/state-and-routing.md) |
| `.docker/Dockerfile.docs` | Builds the VitePress site and serves it with nginx, so the docs deploy like any other service. | [Testing (overview)](../tools/testing-and-docs.md) |
| `.docker/nginx.docs.conf` | The nginx config behind that image. | — |

## Compose

| File | What it is | Read next |
|---|---|---|
| `docker-compose.yml` | The development stack. Ports are chosen so this repo and the paired backend can run side by side without collision. | [Docker & Podman](../tools/docker-and-podman.md) · [Environment Variables](../tools/environment.md) |
| `docker-compose.production.yml` | The production shape of the same stack — the built image, no dev tooling. | [Docker & Podman](../tools/docker-and-podman.md) |
| `.dockerignore` | What never enters the build context: `node_modules`, the test output, and the coverage and mutation reports. | [Docker & Podman](../tools/docker-and-podman.md) |

## CI

| File | What it is | Read next |
|---|---|---|
| `.github/workflows/ci.yml` | The gate on every push and pull request: lint, the contract checks, the build and the test suites. Its e2e job **checks out the paired backend**, because the specs boot a real demo API rather than a mock. | [Package Scripts](../tools/package-scripts.md) · [Live E2E](../tools/live-e2e.md) |
| `.github/workflows/e2e-live.yml` | The scheduled run against a live backend rather than the demo profile — the check that the two repos still agree in practice, not only in contract. | [Live E2E](../tools/live-e2e.md) |
| `.github/workflows/mutation.yml` | The nightly mutation run and the ratchet comparison. | [Mutation Testing](../tools/mutation-testing.md) |
| `.github/workflows/codeql.yml` | GitHub's static security analysis. | [Security](../tools/security.md) |
| `.github/copilot-instructions.md` | The house rules, written for an assistant and equally readable by a person. | [Reading Path](../theory/reading-path.md) |

## Served assets

`public/` is copied into the bundle root untouched — anything here is reachable by URL, and its
filename is the URL.

| Pattern | What it is | Read next |
|---|---|---|
| `public/favicon/*` | The favicon set and its manifests — every size and format a browser or mobile launcher asks for. Referenced from `index.html`. | [Repository Root](./root.md) |
| `public/images/*` | Static imagery the app ships with, as opposed to anything a user uploads — uploads live on the API side and arrive as URLs. | [Infrastructure](./src-infrastructure.md) |

## The docs site itself

The site you are reading. Its pages are not listed one by one — the sidebar already is that list,
and a row per page would be a second copy of it to keep in sync.

| Pattern | What it is | Read next |
|---|---|---|
| `docs/*.md` | The two pages outside a section: the home page and [Getting Started](../getting-started.md). | — |
| `docs/*/*.md` | Every section page — Theory, Tools, API and this Reference section. Use the sidebar. | [Theory](../theory/) · [Tools](../tools/) · [API](../api/) |
| `docs/.vitepress/**` | The site's own configuration and theme. Adding a page means adding it here too, or it exists without a way to reach it. | — |
