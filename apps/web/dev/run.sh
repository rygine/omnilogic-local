#!/bin/bash
set -euo pipefail

app_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)"
cd "$app_dir"

image="${IMAGE:-omnilogic:local}"
name="${CONTAINER_NAME:-omnilogic}"
volume="${1:-./data}"

if [[ $# -gt 1 ]]; then
  echo "usage: ${BASH_SOURCE[0]##*/} [data-dir]" >&2
  exit 2
fi

if ! docker info >/dev/null 2>&1; then
  echo "docker daemon is not running" >&2
  exit 1
fi

if ! docker image inspect "$image" >/dev/null 2>&1; then
  echo "image '$image' not found — run ./dev/build.sh first" >&2
  exit 1
fi

# Docker would otherwise create a missing bind source owned by root.
if [[ ! -d "$volume" ]]; then
  echo "data dir '$volume' does not exist — create it first" >&2
  exit 1
fi
volume="$(cd -- "$volume" &>/dev/null && pwd)"

export IMAGE="$image" CONTAINER_NAME="$name" DATA_PATH="$volume"

# --wait polls the HEALTHCHECK and exits non-zero if it never passes.
if ! docker compose up --detach --wait --wait-timeout 60 --force-recreate; then
  echo >&2
  docker compose logs --tail 20 >&2 || true
  # Stop rather than remove: a crash loop would otherwise outlive this script.
  docker compose stop >/dev/null 2>&1 || true
  echo >&2
  echo "container stopped; full logs: docker compose logs" >&2
  exit 1
fi

published="$(docker port "$name" 2>/dev/null | head -n1 | sed 's/.*-> //' || true)"

echo
echo "running:  http://${published:-127.0.0.1:3000}"
echo "data:     $volume"
echo "output:   docker compose logs -f"
echo "stop:     ./dev/down.sh"
