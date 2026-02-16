# Produção na DigitalOcean (Servidor Zerado, Sem Docker)

Este guia sobe o projeto completo em um Droplet Ubuntu, com:
- API Laravel em Apache
- Frontend Next.js em processo Node (systemd), atrás de Apache (reverse proxy)
- Reverb (WebSocket) em systemd
- Queue worker em systemd
- HTTPS com Let's Encrypt

## 1) Premissas

- Droplet Ubuntu 24.04 LTS
- DNS apontado:
  - `api.seudominio.com` -> IP do Droplet
  - `app.seudominio.com` -> IP do Droplet
- Acesso SSH com usuário sudo
- Banco já existente (local ou remoto)

## 2) Preparação inicial do servidor

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl unzip software-properties-common ca-certificates gnupg lsb-release
```

## 3) Instalar PHP 8.3 + Apache + extensões

```bash
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y \
  apache2 \
  php8.3 php8.3-cli php8.3-fpm php8.3-common \
  php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-gd \
  libapache2-mod-fcgid
```

Habilitar módulos do Apache:

```bash
sudo a2enmod rewrite headers proxy proxy_http proxy_wstunnel ssl http2 actions fcgid alias setenvif
sudo systemctl restart apache2
```

## 4) Instalar Composer

```bash
cd /tmp
curl -sS https://getcomposer.org/installer -o composer-setup.php
php composer-setup.php
sudo mv composer.phar /usr/local/bin/composer
composer --version
```

## 5) Instalar Node 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 6) Clonar repositório (com submodule)

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone --recurse-submodules https://github.com/SEU_USUARIO/SEU_REPO.git dubflow
cd /var/www/dubflow
```

Se já clonou sem submodule:

```bash
git submodule update --init --recursive
```

## 7) Instalar dependências e build

```bash
cd /var/www/dubflow
composer install --no-dev --optimize-autoloader
npm --prefix frontend ci
```

## 8) Configurar `.env` da API

```bash
cd /var/www/dubflow
cp .env.example .env
```

Ajuste os principais campos em `/var/www/dubflow/.env`:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.seudominio.com
FRONTEND_URL=https://app.seudominio.com
APP_FRONTEND_URL=https://app.seudominio.com

DB_CONNECTION=mysql
DB_HOST=SEU_DB_HOST
DB_PORT=3306
DB_DATABASE=SEU_DB
DB_USERNAME=SEU_USER
DB_PASSWORD=SUA_SENHA

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

BROADCAST_CONNECTION=reverb
REVERB_APP_ID=dubflow
REVERB_APP_KEY=CHAVE_FORTE
REVERB_APP_SECRET=SEGREDO_FORTE
REVERB_HOST=app.seudominio.com
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=127.0.0.1
REVERB_SERVER_PORT=8081
```

Gerar chaves e preparar Laravel:

```bash
cd /var/www/dubflow
php artisan key:generate
php artisan jwt:secret --force
php artisan storage:link
php artisan migrate --force
# Opcional (apenas se quiser seed em produção)
# php artisan db:seed --force
php artisan optimize
```

Permissões:

```bash
cd /var/www/dubflow
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rwx storage bootstrap/cache
```

## 9) Configurar env do frontend e build final

Crie `frontend/.env.production`:

```bash
cd /var/www/dubflow/frontend
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://api.seudominio.com/api/v1
INTERNAL_API_URL=https://api.seudominio.com/api/v1
NEXT_PUBLIC_REVERB_APP_KEY=CHAVE_FORTE
NEXT_PUBLIC_REVERB_HOST=app.seudominio.com
NEXT_PUBLIC_REVERB_PORT=443
NEXT_PUBLIC_REVERB_SCHEME=https
NEXT_PUBLIC_SITE_URL=https://app.seudominio.com
EOF
```

Build:

```bash
cd /var/www/dubflow
npm --prefix frontend run build
```

## 10) Serviços systemd (Next, Queue, Reverb)

### 10.1 Next.js

```bash
sudo tee /etc/systemd/system/dubflow-next.service > /dev/null << 'EOF'
[Unit]
Description=DubFlow Next.js
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/dubflow/frontend
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### 10.2 Queue worker

```bash
sudo tee /etc/systemd/system/dubflow-queue.service > /dev/null << 'EOF'
[Unit]
Description=DubFlow Queue Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/dubflow
ExecStart=/usr/bin/php artisan queue:work --sleep=1 --tries=1 --timeout=120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### 10.3 Reverb

```bash
sudo tee /etc/systemd/system/dubflow-reverb.service > /dev/null << 'EOF'
[Unit]
Description=DubFlow Reverb WebSocket Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/dubflow
ExecStart=/usr/bin/php artisan reverb:start --host=127.0.0.1 --port=8081
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Ativar serviços:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dubflow-next dubflow-queue dubflow-reverb
sudo systemctl status dubflow-next dubflow-queue dubflow-reverb --no-pager
```

## 11) Apache VirtualHosts

### 11.1 API (`api.seudominio.com`)

```bash
sudo tee /etc/apache2/sites-available/dubflow-api.conf > /dev/null << 'EOF'
<VirtualHost *:80>
    ServerName api.seudominio.com
    DocumentRoot /var/www/dubflow/public

    <Directory /var/www/dubflow/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/dubflow-api-error.log
    CustomLog ${APACHE_LOG_DIR}/dubflow-api-access.log combined

    <FilesMatch \.php$>
        SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost/"
    </FilesMatch>
</VirtualHost>
EOF
```

### 11.2 Frontend (`app.seudominio.com`)

```bash
sudo tee /etc/apache2/sites-available/dubflow-app.conf > /dev/null << 'EOF'
<VirtualHost *:80>
    ServerName app.seudominio.com

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # Reverb (WebSocket) via domínio do app
    ProxyPass /app ws://127.0.0.1:8081/app
    ProxyPassReverse /app ws://127.0.0.1:8081/app
    ProxyPass /apps http://127.0.0.1:8081/apps
    ProxyPassReverse /apps http://127.0.0.1:8081/apps

    ErrorLog ${APACHE_LOG_DIR}/dubflow-app-error.log
    CustomLog ${APACHE_LOG_DIR}/dubflow-app-access.log combined
</VirtualHost>
EOF
```

Habilitar sites:

```bash
sudo a2ensite dubflow-api.conf dubflow-app.conf
sudo a2dissite 000-default.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## 12) HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d api.seudominio.com -d app.seudominio.com
sudo certbot renew --dry-run
```

## 13) Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
sudo ufw status
```

## 14) Checklist final (smoke test)

```bash
curl -I https://api.seudominio.com/api/v1/posts
curl -I https://app.seudominio.com
sudo systemctl status dubflow-next dubflow-queue dubflow-reverb --no-pager
```

## 15) Rotina de deploy (atualização)

Sempre que subir nova versão:

```bash
cd /var/www/dubflow
git pull
git submodule update --init --recursive

composer install --no-dev --optimize-autoloader
npm --prefix frontend ci
npm --prefix frontend run build

php artisan migrate --force
php artisan optimize:clear
php artisan optimize

sudo systemctl restart dubflow-next dubflow-queue dubflow-reverb
sudo systemctl reload apache2
```

## 16) Rollback rápido

```bash
cd /var/www/dubflow
git log --oneline -n 10
git checkout <commit-ou-tag-anterior>
git submodule update --init --recursive

composer install --no-dev --optimize-autoloader
npm --prefix frontend ci
npm --prefix frontend run build
php artisan optimize:clear
php artisan optimize
sudo systemctl restart dubflow-next dubflow-queue dubflow-reverb
```

## 17) Comandos úteis de diagnóstico

```bash
# logs app Laravel
tail -f /var/www/dubflow/storage/logs/laravel.log

# logs serviços
journalctl -u dubflow-next -f
journalctl -u dubflow-queue -f
journalctl -u dubflow-reverb -f

# status apache/php
sudo systemctl status apache2 php8.3-fpm --no-pager
```

