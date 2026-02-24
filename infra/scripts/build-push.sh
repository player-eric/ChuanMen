#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# build-push.sh — Build the Docker image and push to ECR
# Usage:  ./infra/scripts/build-push.sh [IMAGE_TAG]
# Env:    AWS_ACCOUNT_ID, AWS_REGION (defaults: us-east-1)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?'Set AWS_ACCOUNT_ID env var'}"
ECR_REPO="chuanmen-server"
IMAGE_TAG="${1:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo latest)}"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
FULL_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"

echo "──── Building Docker image ────"
echo "  Image:  $FULL_IMAGE"
echo ""

# 1. Authenticate to ECR
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# 2. Ensure ECR repository exists
aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" 2>/dev/null \
  || aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" \
       --image-scanning-configuration scanOnPush=true

# 3. Build
docker build -t "$FULL_IMAGE" "$SERVER_DIR"

# Also tag as latest
docker tag "$FULL_IMAGE" "${ECR_REGISTRY}/${ECR_REPO}:latest"

# 4. Push both tags
docker push "$FULL_IMAGE"
docker push "${ECR_REGISTRY}/${ECR_REPO}:latest"

echo ""
echo "✅ Pushed $FULL_IMAGE"
echo "✅ Pushed ${ECR_REGISTRY}/${ECR_REPO}:latest"
