#!/bin/sh
# Writes /.well-known/security.txt (RFC 9116) from this container's own environment, every time it
# starts. Off by default: with no VITE_SECURITY_CONTACT or VITE_SECURITY_EXPIRES nothing is
# written, and nginx answers 404 (see the `location = /.well-known/security.txt` block), so a fork
# never publishes someone else's contact. Runtime rather than build time, like `config.js`.
#
# Contact and Expires are the only fields the RFC requires, so both must be set to publish.
# Expires is passed through as written: the operator supplies an ISO 8601 date-time.
set -eu

HTML_ROOT="${SECURITY_TXT_ROOT:-/usr/share/nginx/html}"
TARGET_DIR="$HTML_ROOT/.well-known"
TARGET_FILE="$TARGET_DIR/security.txt"

# One line, control characters stripped (a newline in an env var would inject a header line).
clean() {
    printf '%s' "$1" | tr -d '\000-\037'
}

CONTACT="$(clean "${VITE_SECURITY_CONTACT:-}")"
EXPIRES="$(clean "${VITE_SECURITY_EXPIRES:-}")"
POLICY="$(clean "${VITE_SECURITY_POLICY_URL:-}")"

# A stale file from an earlier start must not outlive the configuration that produced it.
rm -f "$TARGET_FILE"

if [ -z "$CONTACT" ] || [ -z "$EXPIRES" ]; then
    echo "$0: VITE_SECURITY_CONTACT / VITE_SECURITY_EXPIRES not both set, security.txt not published"
    exit 0
fi

mkdir -p "$TARGET_DIR"
{
    printf 'Contact: %s\n' "$CONTACT"
    printf 'Expires: %s\n' "$EXPIRES"
    if [ -n "$POLICY" ]; then
        printf 'Policy: %s\n' "$POLICY"
    fi
    printf 'Preferred-Languages: en\n'
} > "$TARGET_FILE"

echo "$0: wrote $TARGET_FILE"
