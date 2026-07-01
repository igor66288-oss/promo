#!/bin/bash
set -e
cd /opt/promo
TS=$(date +%Y%m%d_%H%M%S)
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres promo_db | gzip > "backups/promo_db_${TS}.sql.gz"
find backups -name "promo_db_*.sql.gz" -mtime +7 -delete
