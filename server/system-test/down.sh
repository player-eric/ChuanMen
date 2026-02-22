#!/usr/bin/env bash
set -euo pipefail

docker rm -f chuanmen-server >/dev/null 2>&1 || true
docker rm -f chuanmen-minio >/dev/null 2>&1 || true
docker rm -f chuanmen-postgres >/dev/null 2>&1 || true
docker network rm chuanmen-system-test >/dev/null 2>&1 || true

echo "System test containers stopped."
