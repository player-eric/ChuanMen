#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# deploy.sh — Build, push, and update the ECS service
# Usage:  ./infra/scripts/deploy.sh [IMAGE_TAG]
# Env:    AWS_ACCOUNT_ID, AWS_REGION, ECS_CLUSTER, ECS_SERVICE
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?'Set AWS_ACCOUNT_ID env var'}"
ECS_CLUSTER="${ECS_CLUSTER:-chuanmen}"
ECS_SERVICE="${ECS_SERVICE:-chuanmen-web}"
IMAGE_TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_REPO="chuanmen-server"
FULL_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"

echo "======================================="
echo "  ChuanMen Deploy"
echo "  Cluster : $ECS_CLUSTER"
echo "  Service : $ECS_SERVICE"
echo "  Image   : $FULL_IMAGE"
echo "======================================="

# 1. Build & push image
echo ""
echo "──── Step 1/3: Build & push Docker image ────"
"$SCRIPT_DIR/build-push.sh" "$IMAGE_TAG"

# 2. Force new deployment (pulls latest image matching the task def)
echo ""
echo "──── Step 2/3: Update ECS service ────"
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --no-cli-pager

# 3. Wait for stable
echo ""
echo "──── Step 3/3: Waiting for service stability ────"
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION"

echo ""
echo "✅ Deploy complete — service is stable"
