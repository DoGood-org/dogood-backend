# Setup

## Using Docker (dev environment)

Requirements:
 - Docker (Desktop version preferably).
 - 4gb of free space.

First of all create `.env` file as shown in `.env.compose.example`, then use setup script. 

```bash
# simply enter this
./setup.ps1 # For Windows Users
```

```bash
./setup.sh            # For Linux and MacOS
chmod 111 setup.sh    # UNIX always wants rights for execution. You need to do it by yourself
```

In case of container sutdown simply re-execute `setup.sh` or `setup.ps1`. 

### Connecting to Docker's db 

Containerized database listens on port `5444`, and from local machine you should connect to specifically this port.   
For your local db you are connecting as usual. Through port `5432`. 
It is done like this to avoid connection conflict between local and container databases via the same port. 

### Entering containerized environment

Now the entire project is set up inside your local machine. For entering server's shell simply enter what's below:

```bash
docker exec -it dogood bash
```

For developing inside it simply attach to `dogood` container via IDE. 
Everything is set up already. If you want to ping to other services inside container, then simply call them by name (not IP).
Environment already contains both frontend and backend for wirking within it.

```bash
cd /frontend # for opening frontend
cd /backend  # for opening backend
```
For starting either `backend` or `frontend` simply enter `npm run dev` in one of those directories and everything is set up.

### Redis local issue

For developig in local the folowing line of code have been commented in `src/lib/redis.ts`:

```typescript
const redis = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD || undefined,
  // tls: {},  <----- This is commented for developing in local.
});

```
In case of using in cloud tls will be activated.

### Pushing changes to remote repo

All changes made inside Docker are applied to your local repo. Simply push from local as usual, but make changes inside docker. 

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
