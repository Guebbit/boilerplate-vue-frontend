#!/bin/sh
# Writes /usr/share/nginx/html/config.js from this container's own environment, every time it
# starts — a config change is a restart, not a rebuild. Runs automatically: the official nginx
# image sources every executable *.sh under /docker-entrypoint.d/ before starting nginx itself.
# https://github.com/nginxinc/docker-nginx/blob/master/entrypoint/docker-entrypoint.sh
#
# `src/infrastructure/runtime-config.ts` is the one reader; `index.html` loads this file before
# the app bundle. Design and whitelist: `docs/tools/environment.md`, "Runtime configuration".
# Every value here already ships to the browser via the compiled bundle today — never a secret.
set -eu

CONFIG_FILE="/usr/share/nginx/html/config.js"

# JSON-escapes one value: backslash and double-quote, then strips control characters (newlines
# above all — an operator-supplied env var with one would otherwise break the generated script).
json_escape() {
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\000-\037'
}

# One JS object property, or nothing when the variable is unset/blank — an absent key is
# `undefined` to the reader, same as a `config.js` that was never written.
config_entry() {
    key="$1"
    value="$2"
    if [ -n "$value" ]; then
        printf '  "%s": "%s",\n' "$key" "$(json_escape "$value")"
    fi
}

{
    printf 'window.__APP_CONFIG = {\n'
    config_entry 'API_URL' "${VITE_API_URL:-}"
    config_entry 'API_SSE' "${VITE_API_SSE:-}"
    config_entry 'APP_NAME' "${VITE_APP_NAME:-}"
    config_entry 'APP_LOGO' "${VITE_APP_LOGO:-}"
    config_entry 'LOCALE_TENANT' "${VITE_LOCALE_TENANT:-}"
    config_entry 'APP_DEFAULT_LOCALE' "${VITE_APP_DEFAULT_LOCALE:-}"
    config_entry 'APP_FALLBACK_LOCALE' "${VITE_APP_FALLBACK_LOCALE:-}"
    config_entry 'APP_LOG_LEVEL' "${VITE_APP_LOG_LEVEL:-}"
    config_entry 'APP_LOG_SCOPES' "${VITE_APP_LOG_SCOPES:-}"
    config_entry 'APP_EMPTY_VALUE' "${VITE_APP_EMPTY_VALUE:-}"
    config_entry 'AXIOS_TIMEOUT' "${VITE_AXIOS_TIMEOUT:-}"
    config_entry 'MAX_UPLOAD_BYTES' "${VITE_MAX_UPLOAD_BYTES:-}"
    config_entry 'FARO_URL' "${VITE_FARO_URL:-}"
    config_entry 'FARO_APP_NAME' "${VITE_FARO_APP_NAME:-}"
    config_entry 'FARO_APP_VERSION' "${VITE_FARO_APP_VERSION:-}"
    config_entry 'FARO_ENVIRONMENT' "${VITE_FARO_ENVIRONMENT:-}"
    config_entry 'UMAMI_SRC' "${VITE_UMAMI_SRC:-}"
    config_entry 'UMAMI_WEBSITE_ID' "${VITE_UMAMI_WEBSITE_ID:-}"
    config_entry 'UMAMI_REQUIRE_CONSENT' "${VITE_UMAMI_REQUIRE_CONSENT:-}"
    # A trailing comma above is always valid JS in an object literal, including after the last
    # real entry, so no entry needs special-casing as "the last one".
    printf '};\n'
} > "$CONFIG_FILE"

echo "$0: wrote $CONFIG_FILE"
