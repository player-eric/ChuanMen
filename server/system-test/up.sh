#!/usr/bin/env bash
set -euo pipefail

NETWORK_NAME="chuanmen-system-test"
MONGO_CONTAINER="chuanmen-mongo"
MINIO_CONTAINER="chuanmen-minio"
SERVER_CONTAINER="chuanmen-server"
SERVER_IMAGE="chuanmen-server-system-test"
MC_CONFIG_DIR="$PWD/.mc-config"

echo "[1/8] Create network"
docker network inspect "$NETWORK_NAME" >/dev/null 2>&1 || docker network create "$NETWORK_NAME" >/dev/null

echo "[2/8] Start MongoDB"
docker rm -f "$MONGO_CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$MONGO_CONTAINER" \
  --network "$NETWORK_NAME" \
  -p 27017:27017 \
  mongo:7 >/dev/null

echo "[3/8] Start MinIO"
docker rm -f "$MINIO_CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$MINIO_CONTAINER" \
  --network "$NETWORK_NAME" \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio:latest server /data --console-address ':9001' >/dev/null

echo "[4/8] Wait for MinIO ready"
mkdir -p "$MC_CONFIG_DIR"
until curl -sf "http://localhost:9000/minio/health/ready" >/dev/null; do
  sleep 2
done

echo "[5/8] Create bucket"
docker run --rm \
  --network "$NETWORK_NAME" \
  -v "$MC_CONFIG_DIR:/mc" \
  minio/mc:latest \
  --config-dir /mc alias set local "http://$MINIO_CONTAINER:9000" minioadmin minioadmin >/dev/null

docker run --rm \
  --network "$NETWORK_NAME" \
  -v "$MC_CONFIG_DIR:/mc" \
  minio/mc:latest \
  --config-dir /mc mb -p local/chuanmen-media-dev >/dev/null 2>&1 || true

echo "[6/8] Build server image"
docker build -t "$SERVER_IMAGE" . >/dev/null

echo "[7/8] Start server"
docker rm -f "$SERVER_CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$SERVER_CONTAINER" \
  --network "$NETWORK_NAME" \
  --add-host=host.docker.internal:host-gateway \
  -p 4000:4000 \
  -e APP_ENV=local \
  -e NODE_ENV=development \
  -e PORT=4000 \
  -e FRONTEND_ORIGIN=http://localhost:4000 \
  -e TRUST_PROXY=false \
  -e MONGODB_URI="mongodb://$MONGO_CONTAINER:27017/chuanmen_dev" \
  -e MONGODB_DB_NAME=chuanmen_dev \
  -e AWS_REGION=ap-southeast-1 \
  -e AWS_ACCESS_KEY_ID=minioadmin \
  -e AWS_SECRET_ACCESS_KEY=minioadmin \
  -e AWS_S3_BUCKET=chuanmen-media-dev \
  -e AWS_S3_ENDPOINT=http://host.docker.internal:9000 \
  -e AWS_S3_FORCE_PATH_STYLE=true \
  -e AWS_S3_PUBLIC_BASE_URL=http://localhost:9000/chuanmen-media-dev \
  -e S3_PRESIGN_EXPIRES_SECONDS=900 \
  "$SERVER_IMAGE" >/dev/null

echo "[8/8] Done"
echo "System test URL: http://localhost:4000/system-test/"
echo "API health URL:   http://localhost:4000/api/health"
echo "MinIO console:    http://localhost:9001  (minioadmin / minioadmin)"
