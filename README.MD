# Setup

## Using Docker (dev environment)

Requirements:
 - Docker (Desktop version preferably).
 - 4gb of free space.

First of all create `.env` file as shown in `.env.compose.example`, then use setup script.
```bash
# simply enter this

./setup.ps1 # For Windows Users
./setup.sh  # For Linux and MacOS
```
Now the entire project is set up inside your local machine. For entering server's shell simply enter what's below:

```
docker exec -it dogood bash
```

For developing inside it simply attach to `dogood` container via IDE. Everything is set up already. If you want to ping to other services, then simply call them by name (not IP).

## Manually

### 1. Start Redis (Docker)
```
docker compose up -d
```
### 2. Install deps
```
npm install
```
### 3. Generate Prisma client
```
npx prisma generate
```
### 4. (Optional) Run migrations
```
npx prisma migrate dev
```
### ⚠️CAUTION!⚠️

In `/prisma/schema.prisma` for `location` field use `Unsupported("geography")` instead of `String` if not working locally!

### 5. Run the app
```
npm run dev
```
### Сервер
```
PORT=
NODE_ENV=
```
### neonDB prisma loads this line
``` 
DATABASE_URL=
```
### Логирование
```
LOG_LEVEL=
```


### Порт для WebSocket
```
WS_PORT=
```
### Порт для WebSocket Secure

```
WS_SECURE_PORT=
```

###JWT
```
JWT_SECRET=
JWT_EXPIRATION=
### JWT Refresh
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRATION=
```

###base url for frontend
```
BASE_URL=
```
### Email
```
DOGOOD_EMAIL=
DOGOOD_PASSWORD=
```
###openAI
```
OPENAI_API_KEY=
```

### Порт для Redis
```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=          ### Leave empty for local
REDIS_USE_TLS=false
```