#!/bin/sh
# Decides whether this deployment may be indexed, every time the container starts, and writes the
# two files that say so: /robots.txt, and the nginx `map` behind the `X-Robots-Tag` header.
#
# OFF (the default: staging, forks, a preview): every response carries `X-Robots-Tag: noindex,
# nofollow`, and robots.txt ALLOWS crawling. Not `Disallow: /` — a crawler that may not fetch a
# page never sees its noindex, and the URL can still be listed from links elsewhere. noindex that
# the crawler can read is Google's documented way to keep a whole site out.
# ON (VITE_ROBOTS_INDEX=true): no header, and robots.txt names the API's sitemap. The sitemap is on
# the API host; sitemaps.org allows a `Sitemap:` line to point at another host.
# https://developers.google.com/search/docs/crawling-indexing/block-indexing
#
# Design: docs/tools/environment.md#robots-and-indexing
set -eu

HTML_ROOT="${NGINX_HTML_ROOT:-/usr/share/nginx/html}"
CONF_DIR="${NGINX_CONF_DIR:-/etc/nginx/conf.d}"
ROBOTS_FILE="$HTML_ROOT/robots.txt"
# Named `00-` so nginx reads it before `default.conf`, which uses the variable it defines.
MAP_FILE="$CONF_DIR/00-robots-tag.conf"

# One line, control characters stripped (a newline in an env var would inject a robots.txt rule).
clean() {
    printf '%s' "$1" | tr -d '\000-\037'
}

INDEX="$(clean "${VITE_ROBOTS_INDEX:-}" | tr '[:upper:]' '[:lower:]')"
API_URL="$(clean "${VITE_API_URL:-}")"

mkdir -p "$HTML_ROOT" "$CONF_DIR"

# A `map` on `$host` with only a default: the value is the same for every request. nginx omits an
# `add_header` whose value is empty, so the "on" case needs no second code path in nginx.conf.
# https://nginx.org/en/docs/http/ngx_http_map_module.html
write_map() {
    printf 'map $host $robots_tag {\n    default "%s";\n}\n' "$1" > "$MAP_FILE"
}

case "$INDEX" in
    true | 1 | yes | on)
        write_map ""
        {
            printf 'User-agent: *\n'
            printf 'Allow: /\n'
            if [ -n "$API_URL" ]; then
                # No trailing slash, so the line is `.../sitemap/index.xml` whichever way it was set.
                printf '\nSitemap: %s/sitemap/index.xml\n' "${API_URL%/}"
            fi
        } > "$ROBOTS_FILE"
        echo "$0: indexing ON, wrote $ROBOTS_FILE"
        ;;
    *)
        write_map "noindex, nofollow"
        printf 'User-agent: *\nAllow: /\n' > "$ROBOTS_FILE"
        echo "$0: indexing OFF (VITE_ROBOTS_INDEX is not true), every response says noindex"
        ;;
esac
