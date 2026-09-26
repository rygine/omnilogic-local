#!/bin/bash
set -euo pipefail

app_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &>/dev/null && pwd)"
cd "$app_dir"

if ! docker info >/dev/null 2>&1; then
  echo "docker daemon is not running" >&2
  exit 1
fi

export IMAGE="${IMAGE:-omnilogic:local}" CONTAINER_NAME="${CONTAINER_NAME:-omnilogic}"

docker compose down
