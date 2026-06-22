#!/bin/bash
# Deploy Promo Platform to Hetzner (HTTP, no domain required)
# Usage: ./deploy.sh root@YOUR_SERVER_IP
set -e

SERVER=${1:?"Usage: ./deploy.sh root@server-ip"}
REMOTE_DIR="/opt/promo"

echo "==> Syncing files to $SERVER..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude '.turbo' \
  --exclude '*.log' \
  ./ "$SERVER:$REMOTE_DIR/"

echo "==> Deploying on server..."
ssh "$SERVER" bash << 'ENDSSH'
  set -e
  cd /opt/promo

  if [ ! -f .env ]; then
    cp .env.production.example .env
    echo ""
    echo "!!! Заполни переменные и перезапусти деплой:"
    echo "    nano /opt/promo/.env"
    exit 1
  fi

  echo "==> Building and starting containers..."
  docker compose -f docker-compose.prod.yml up -d --build

  echo "==> Ждём запуска (30s)..."
  sleep 30
  docker compose -f docker-compose.prod.yml ps
ENDSSH

echo ""
echo "==> Готово! Открывай http://$(echo $SERVER | cut -d@ -f2)"
