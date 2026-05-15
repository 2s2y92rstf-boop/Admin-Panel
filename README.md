# 🛡️ Admin Panel — Логування форм в реальному часі

## Структура проекту

```
admin-project/
├── server/
│   ├── server.js       ← Node.js WebSocket сервер
│   └── package.json
├── site/
│   ├── index.html      ← Демо сайт з формами
│   └── tracker.js      ← Скрипт трекінгу (вставляєш на свій сайт)
└── admin/
    └── index.html      ← Адмін панель з live-логами
```

---

## 🚀 Запуск на Hetzner (Ubuntu 22/24)

### 1. Підключись до сервера
```bash
ssh root@YOUR_SERVER_IP
```

### 2. Встанови Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v  # має бути v20+
```

### 3. Встанови Nginx
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

### 4. Клонуй або завантаж проект
```bash
mkdir /var/www/admin-project
cd /var/www/admin-project
# скопіюй файли через scp або git clone
```

### 5. Запусти сервер
```bash
cd /var/www/admin-project/server
npm install
node server.js
# ✅ Сервер на http://localhost:3000
```

### 6. Щоб сервер не зупинявся (PM2)
```bash
npm install -g pm2
pm2 start server.js --name admin-logger
pm2 save
pm2 startup
```

### 7. Налаштуй Nginx

Файл: `/etc/nginx/sites-available/admin`
```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    # Адмін панель (статика)
    location / {
        root /var/www/admin-project/admin;
        index index.html;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # API для логів
    location /log {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    location /logs {
        proxy_pass http://localhost:3000;
    }
}

server {
    listen 80;
    server_name yourdomain.com;

    # Твій сайт
    location / {
        root /var/www/admin-project/site;
        index index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d admin.yourdomain.com
```

---

## 🔌 Підключення трекера до свого сайту

Вставте **перед `</body>`** на кожній сторінці де є форми:

```html
<script src="https://yourdomain.com/tracker.js" data-server="https://yourdomain.com"></script>
```

Або через CDN якщо сайт на окремому домені:
```html
<script src="https://yourdomain.com/tracker.js" data-server="https://yourdomain.com"></script>
```

---

## 📡 API Endpoints

| Метод | URL | Опис |
|-------|-----|------|
| `POST` | `/log` | Відправити подію з сайту |
| `GET`  | `/logs` | Отримати всі логи |
| `GET`  | `/stats` | Статистика |
| `WS`   | `/ws` | WebSocket для адмінки |

---

## 🔒 Що логується

| Подія | Дані |
|-------|------|
| `form_submit` | Всі поля форми (паролі/CVV замасковані) |
| `sensitive_field_focus` | Фокус на полі пароль/картка |
| `validation_error` | Помилки валідації HTML5 |

---

## ⚠️ Безпека

- Адмін панель захистіть паролем через Nginx Basic Auth або додайте JWT авторизацію
- В продакшні використовуйте HTTPS (SSL)
- Ніколи не логуйте незамаскований пароль або CVV
- Додайте IP whitelist для `/admin`

```bash
# Nginx Basic Auth
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd admin
# В nginx config додай:
# auth_basic "Admin";
# auth_basic_user_file /etc/nginx/.htpasswd;
```
