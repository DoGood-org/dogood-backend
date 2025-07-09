# 1. Start Redis (Docker)
docker compose up -d

# 2. Install deps
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. (Optional) Run migrations
npx prisma migrate dev

# 5. Run the app

npm run dev



make sure

# Сервер
PORT=
NODE_ENV=

# neonDB prisma loads this line 
DATABASE_URL=

# Логирование

LOG_LEVEL=



# Порт для WebSocket
WS_PORT=

# Порт для WebSocket Secure
WS_SECURE_PORT=


#JWT
JWT_SECRET=
JWT_EXPIRATION=
# JWT Refresh
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRATION=


#base url for frontend
BASE_URL=

# Email
DOGOOD_EMAIL=
DOGOOD_PASSWORD=

#openAI
OPENAI_API_KEY=


# Порт для Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=          # Leave empty for local
REDIS_USE_TLS=false