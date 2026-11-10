---
source: docker/Dockerfile.docs
sha256: ee078d82ab9237d2b88852c3cbf323ece842b2c55f5fb835b7f285c8dee81b59
signature: ee078d82ab9237d2b88852c3cbf323ece842b2c55f5fb835b7f285c8dee81b59
generated_at: 2026-11-10T02:14:40.953506+00:00
model: ollama:qwen3.8:27b
---

# docker/Dockerfile.docs

## Purpose

Multi-stage Docker build that compiles the VitePress documentation site into static files and serves them with Nginx. It exists so the docs site can be run as a lightweight, standalone container without carrying the full Node.js runtime.

## Key elements

- **Stage 1 – `builder` (node:24-alpine):** Copies manifests + `.npmrc`, runs `npm ci`, then `npm run docs:build` to produce static output at `docs/.vitepress/dist`.
- **Stage 2 – server (nginx:alpine):** Wipes the default Nginx HTML directory, copies the built VitePress output from the builder stage, applies a custom Nginx config, and serves on port 80.
- **`docker/nginx.docs.conf`:** Custom Nginx configuration (SPA-like fallback routing, caching headers) mounted at `/etc/nginx/conf.d/default.conf`.
- **`.npmrc` in the builder stage:** Copied alongside `package*.json` so that `npm ci` resolves the same `legacy-peer-deps` settings used in development, keeping the lockfile consistent.

## Relationships

- **docker-compose.yml** – References this Dockerfile to build and run the docs service (image build context, port mapping to the exposed `80`, and likely volume or network settings for the static server).

## Notes

- `.npmrc` must be present *before* `npm ci`; without it the lockfile may disagree with resolved dependencies. It is intentionally copied in the same layer as the manifests to exploit Docker layer caching.
- The Nginx config (`docker/nginx.docs.conf`) is required at build time—if it is missing the build fails at the `COPY` step, even though the header comment calls it "optional."
- DevDependencies are installed (not pruned) because VitePress itself is a devDependency; the production image still avoids Node.js by shipping only the static build.
