---
source: docker/Dockerfile
sha256: 02e20c23c0fcd0e9dd29d4b026c99de92e34ef1e5591ae0cd401fcf009140d2c
signature: 02e20c23c0fcd0e9dd29d4b026c99de92e34ef1e5591ae0cd401fcf009140d2c
generated_at: 2026-11-10T02:14:32.858919+00:00
model: ollama:qwen3.8:27b
---

# docker/Dockerfile

## Purpose

Builds a minimal Alpine-based Node image that runs the Vite dev server for local development. It exists so `docker-compose up` can start the app without a local Node/npm install.

## Key elements

- **`FROM node:24-alpine`** – Base image; small footprint, ships Node + npm.
- **`WORKDIR /app`** – All subsequent paths resolve relative to this directory.
- **`COPY package*.json .npmrc ./`** – Copies manifests and `.npmrc` before source, so the dependency-install layer is cached unless those files change.
- **`RUN npm ci`** – Installs all dependencies *including devDependencies* (required by the Vite dev server).
- **`COPY . .`** – Copies the full project source into the image.
- **`EXPOSE 8080`** – Documentation only; does not publish a port. Matches `VITE_APP_PORT` set in `vite.config.ts`.
- **`CMD ["npm", "run", "dev"]`** – Default runtime command (exec form).

## Relationships

- **`docker-compose.yml`** – Compose uses this Dockerfile to build the image and maps the published port. The `EXPOSE 8080` line and the `VITE_APP_PORT` value in `vite.config.ts` must agree on the port; compose uses the same value for its `ports:` mapping. The `CMD` is what compose runs when the container starts (unless overridden).

## Notes

- The inline comment above `FROM` says "node 25" but the actual tag is `node:24-alpine`. Treat the tag as authoritative; the comment is stale.
- `.npmrc` is copied alongside the manifests specifically because `legacy-peer-deps=true` there changes what `npm ci` expects in the lockfile. Removing it from the `COPY` line will break the install.
- `EXPOSE` has zero runtime effect. Changing `VITE_APP_PORT` in `vite.config.ts` without updating this line still works, but the file will be misleading.
- `CMD` uses JSON/exec form deliberately (no extra shell process).
