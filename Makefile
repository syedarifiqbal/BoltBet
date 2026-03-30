.PHONY: up down down-v restart logs ps certs gateway-reload keys

# Start all infrastructure
up:
	docker compose up -d

# Stop all containers (keep volumes)
down:
	docker compose down

# Stop all containers AND wipe volumes (clean slate)
down-v:
	docker compose down -v

# Restart a specific service: make restart svc=openresty
restart:
	docker compose restart $(svc)

# Tail logs for all services (or one: make logs svc=openresty)
logs:
ifndef svc
	docker compose logs -f
else
	docker compose logs -f $(svc)
endif

# Show container status
ps:
	docker compose ps

# Generate self-signed TLS certificates for local dev
certs:
	./scripts/gen-certs.sh

# Reload Nginx config without downtime (after nginx.conf edits)
gateway-reload:
	docker compose exec openresty openresty -s reload

# Generate RS256 key pair + password pepper for .env
# Prints env var lines — paste them into your .env file
keys:
	./scripts/gen-keys.sh
