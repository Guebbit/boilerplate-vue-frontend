---
source: docker/docker-entrypoint.d/42-generate-robots.sh
sha256: e562f297d43c6e9621fd80d25a541e6e782142250c25aafebf5b2191a729a7d2
signature: e562f297d43c6e9621fd80d25a541e6e782142250c25aafebf5b2191a729a7d2
generated_at: 2026-11-10T02:15:47.366365+00:00
model: ollama:qwen3.8:27b
---

# docker/docker-entrypoint.d/42-generate-robots.sh

## Purpose

Runs at every container start to decide whether this deployment is eligible for search-engine indexing, then materialises that decision into two files the running nginx can serve: a `robots.txt` and an `nginx map` snippet that drives the `X-Robots-Tag` response header. The "off" path is the default and is deliberately designed so that even a crawler that can't fetch a page still sees a readable `noindex` signal.

## Key elements

- **`clean()`** – strips all control characters (`\000`–`\037`) from an environment value via `tr`, preventing newline-injection into generated config files.
- **`INDEX`** – normalised, lowercased value of `VITE_ROBOTS_INDEX` (cleaned). Treated as "on" only for `true`, `1`, `yes`, or `on`.
- **`API_URL`** – cleaned value of `VITE_API_URL`; used to emit a `Sitemap:` line when indexing is on.
- **`write_map()`** – writes the `00-robots-tag.conf` nginx `map` block. A single `default` value means the header is identical for every host; an empty value causes nginx to omit the `add_header` entirely (no second code path needed).
- **`ROBOTS_FILE`** (`$HTML_ROOT/robots.txt`) – the user-facing robots file.
- **`MAP_FILE`** (`$CONF_DIR/00-robots-tag.conf`) – the nginx variable definition; the `00-` prefix guarantees it is parsed before `default.conf`, which references `$robots_tag`.

## Relationships

No graph neighbours are recorded for this file. It is a leaf entrypoint script: it reads environment variables and writes two static files that the main nginx process picks up at its own (re)load.

## Notes

- **Off ≠ `Disallow: /`.** When indexing is off the robots file still says `Allow: /`. This is intentional: a `Disallow` would prevent the crawler from fetching the page and therefore from reading the `noindex` header. Google's documented site-wide exclusion relies on a readable `noindex`.
- **Trailing-slash handling.** `VITE_API_URL` is stripped of any trailing `/` before appending `/sitemap/index.xml`, so both `https://api.example.com` and `https://api.example.com/` produce the same sitemap line.
- **`set -eu`** – any unset variable or failed command aborts the script, which will block container startup (fail-closed).
- **`mkdir -p`** on both directories ensures the script is idempotent and works even if the image layout changed.
- The design rationale lives in `docs/tools/environment.md` under the "robots-and-indexing" section (referenced in the header comment).
