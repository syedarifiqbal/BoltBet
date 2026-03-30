#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# BoltBet — generate RS256 key pair for JWT signing
#
# Usage: make keys   (or run this script directly)
#
# Output: prints the two env var lines ready to paste into your .env file.
#         Does NOT write to .env automatically — review before pasting.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

PRIVATE="$TMPDIR/private.pem"
PUBLIC="$TMPDIR/public.pem"

echo "Generating 4096-bit RSA key pair..."
openssl genrsa -out "$PRIVATE" 4096 2>/dev/null
openssl rsa -in "$PRIVATE" -pubout -out "$PUBLIC" 2>/dev/null

# Convert PEM files to single-line env var format (real \n → literal \n)
PRIVATE_VAR=$(awk 'NF {printf "%s\\n", $0}' "$PRIVATE")
PUBLIC_VAR=$(awk 'NF {printf "%s\\n", $0}' "$PUBLIC")
PEPPER=$(openssl rand -hex 32)

echo ""
echo "─────────────────────────────────────────────────────────────────────────────"
echo "Add these lines to your .env file:"
echo "─────────────────────────────────────────────────────────────────────────────"
echo ""
echo "JWT_PRIVATE_KEY=\"${PRIVATE_VAR}\""
echo "JWT_PUBLIC_KEY=\"${PUBLIC_VAR}\""
echo "PASSWORD_PEPPER=${PEPPER}"
echo ""
echo "─────────────────────────────────────────────────────────────────────────────"
echo "Keep JWT_PRIVATE_KEY secret. Never commit it. Never share it."
echo "─────────────────────────────────────────────────────────────────────────────"
