# Деплой на Hetzner (по IP, без домена)

## 1. Создай сервер на Hetzner

- Тип: **CX22** (2 vCPU, 4 GB RAM) или выше
- ОС: **Ubuntu 24.04**
- Запомни IP (например `65.21.100.200`)

## 2. Установи Docker на сервере

```bash
ssh root@YOUR_SERVER_IP

curl -fsSL https://get.docker.com | sh
mkdir -p /opt/promo
exit
```

## 3. Настрой переменные (на своей машине)

```bash
cd C:\Users\igor6\promo
copy .env.production.example .env.production
```

Открой `.env.production` и замени `YOUR_SERVER_IP` на реальный IP:

```env
POSTGRES_PASSWORD=МойСильныйПароль123
JWT_SECRET=длинная-случайная-строка
NEXT_PUBLIC_API_URL=http://65.21.100.200/api
OMISE_PUBLIC_KEY=
OMISE_SECRET_KEY=
```

Переименуй в `.env` (docker compose читает именно `.env`):

```bash
# В папке C:\Users\igor6\promo
copy .env.production .env
```

## 4. Задеплой

В Git Bash / WSL (из папки проекта):

```bash
bash deploy.sh root@65.21.100.200
```

Скрипт:
1. Rsync копирует файлы на сервер в `/opt/promo`
2. `docker compose up --build` собирает образы и запускает всё
3. Prisma автоматически применяет миграции при старте API

После — открывай `http://65.21.100.200` в браузере.

## 5. Обновление

Любые изменения в коде — просто повтори:

```bash
bash deploy.sh root@65.21.100.200
```

## Мониторинг

```bash
ssh root@65.21.100.200

# Логи всех контейнеров
docker compose -f /opt/promo/docker-compose.prod.yml logs -f

# Только API
docker compose -f /opt/promo/docker-compose.prod.yml logs -f api

# Статус контейнеров
docker compose -f /opt/promo/docker-compose.prod.yml ps

# Перезапустить один сервис
docker compose -f /opt/promo/docker-compose.prod.yml restart api
```

## Когда появится домен

Добавь SSL одной командой:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

Потом обнови `nginx/nginx.conf` (раскомментируй HTTPS блок) и задеплой снова.
