#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="$(dirname "$0")/../nginx/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
  -keyout "$CERT_DIR/privkey.pem" \
  -out    "$CERT_DIR/fullchain.pem" \
  -subj   "/CN=localhost/O=BoltBet Dev" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# For self-signed certs the chain IS the cert
cp "$CERT_DIR/fullchain.pem" "$CERT_DIR/chain.pem"

echo "Certificates written to $CERT_DIR"
echo "  fullchain.pem  — certificate"
echo "  privkey.pem    — private key"
echo "  chain.pem      — CA chain (same as cert for self-signed)"
