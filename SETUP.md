# Локальний запуск DoGood backend у Docker

Інструкція: як заповнити `.env`, підняти контейнери, які порти прокидаються назовні і як перевірити, що все працює.

---

## 1. Що потрібно встановити

- **Docker** + **Docker Compose v2** (команда `docker compose`, не `docker-compose`)
- **Node.js 22+** і **pnpm** — тільки якщо API запускається локально, а не в контейнері (сценарій Б нижче)

---

## 2. Які контейнери є

`docker-compose.yaml` (проєкт `dogood`) описує три сервіси:

| Сервіс | Контейнер | Образ / збірка | Порт `хост:контейнер` | Volume |
|---|---|---|---|---|
| `postgres` | `doogood_app_postgres` | збирається з `docker/postgres/Dockerfile` → `postgis/postgis:16-3.7` (тег `dogood-postgis:16`) | `5432:5432` | `postgres_data_app` → `/var/lib/postgresql/data` |
| `redis` | `doogood_app_redis` | `redis:7-alpine` | `6379:6379` | `doogood_app_redis_data` → `/data` |
| `api` | `doogood_app_api` | збирається з `docker/app/Dockerfile` | `4000:4000` | — |

- У `postgres` і `redis` є healthcheck (`pg_isready` / `redis-cli ping`); `api` стартує лише коли обидва `healthy`.
- Усі три сервіси читають змінні з `.env` (`env_file: .env`).
- Postgres створює користувача й базу з `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` **лише при першому запуску на порожньому volume**. Якщо потім змінити ці змінні — вони не застосуються, доки не видалити volume (`docker compose down -v`).
- Розширення PostGIS вмикає міграція Prisma, а не init-скрипт.
- Redis наразі кодом не використовується — він піднімається на майбутнє.
- `api` при **кожному** старті виконує:
  1. `prisma migrate deploy` — накочує міграції;
  2. `prisma/seed.ts` — сиди (тільки `upsert`, повторний запуск нічого не ламає);
  3. `node dist/main.js` — сам сервер.
- `docker/app/Dockerfile` — **тільки для локальної розробки** (містить dev-залежності й сиди). Кореневий `Dockerfile` — образ для CI/CD, його локально не використовуємо.

---

## 3. Файл `.env`

```bash
cp .env.example .env
```

Орієнтуйтесь на `.env.example` — саме ці змінні читає код. `.env.compose.example` — інший, частково застарілий файл (Stripe, Cloudinary, `NEXT_PUBLIC_*`, Redis-змінні, які код поки не читає); для запуску бекенду він не потрібен.

### Змінні

| Змінна | Обов'язкова | Приклад | Навіщо |
|---|---|---|---|
| `NODE_ENV` | ні (дефолт `development`) | `development` | при `production` cookie стають `secure` + `sameSite=strict` — локально по http логін не працюватиме |
| `PORT` | **так** | `4000` | порт API. Для Docker має бути **4000**, бо в compose жорстко прописано `4000:4000` |
| `FRONTEND_URL` | так | `http://localhost:5173` | дозволений CORS origin (адреса фронтенду) |
| `POSTGRES_USER` | так | `postgres` | користувач, якого створить контейнер Postgres |
| `POSTGRES_PASSWORD` | так | `postgres` | пароль цього користувача |
| `POSTGRES_DB` | так | `app_db` | база, яку створить контейнер |
| `DATABASE_URL` | **так** | див. нижче | рядок підключення Prisma; логін/пароль/база мають збігатися з `POSTGRES_*` |
| `JWT_ACCESS_SECRET` | **так** | довгий випадковий рядок | підпис access-токена |
| `JWT_REFRESH_SECRET` | **так** | інший довгий випадковий рядок | підпис refresh-токена |
| `JWT_ACCESS_EXPIRES` | ні (дефолт `15m`) | `15m` | час життя access-токена |
| `JWT_REFRESH_EXPIRES` | ні (дефолт `7d`) | `7d` | час життя refresh-токена |
| `SMTP_HOST` | **так** | `smtp.gmail.com` | SMTP-сервер для листів (верифікація, скидання пароля) |
| `SMTP_PORT` | **так** | `587` | порт SMTP |
| `SMTP_USER` | **так** | `your-email@gmail.com` | логін SMTP |
| `SMTP_PASS` | **так** | app password | пароль SMTP (для Gmail — App Password) |
| `SMTP_FROM` | ні | `DoGood <noreply@dogood.com>` | адреса відправника |
| `SWAGGER_ENABLED` | ні | `true` | вмикає Swagger UI на `/api/docs` |

«Обов'язкова» = без неї застосунок падає на старті (`getOrThrow`). Для SMTP достатньо будь-яких непорожніх значень, щоб сервер піднявся; реальні листи підуть тільки з робочими кредами.

Згенерувати секрети JWT:

```bash
openssl rand -base64 48
```

### `DATABASE_URL` — головна пастка

Хост у `DATABASE_URL` залежить від того, **звідки** підключаються до бази:

- API працює **в контейнері** (`api`) → хост `postgres` (ім'я сервісу в мережі compose):
  ```env
  DATABASE_URL="postgresql://postgres:postgres@postgres:5432/app_db?schema=public"
  ```
- API або `prisma`-команди запускаються **на хості** (`pnpm run start:dev`, `npx prisma migrate dev`) → хост `localhost`:
  ```env
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app_db?schema=public"
  ```

У compose немає окремого перевизначення `DATABASE_URL` для `api`, тому береться значення з `.env`. З `localhost` контейнер `api` стукатиме сам у себе і впаде на `prisma migrate deploy` з помилкою `P1001: Can't reach database server`. Перемикаючись між сценаріями, міняйте хост у `.env`.

Пишіть значення явно, без `${POSTGRES_USER}`-підстановок: Compose їх розкриває, а Nest `ConfigModule` — ні.

---

## 4. Сценарій А — усе в Docker

1. У `.env` хост бази — `postgres`, `PORT=4000`.
2. Зібрати й підняти:
   ```bash
   docker compose up -d --build
   ```
3. Подивитись логи API (міграції → сиди → старт):
   ```bash
   docker compose logs -f api
   ```
4. Перевірити:
   ```bash
   curl http://localhost:4000/health/liveness     # OK
   curl http://localhost:4000/health/readiness    # {"status":"ready",...}
   ```

Після змін у коді контейнер треба перезібрати: `docker compose up -d --build api` (hot reload в контейнері немає).

---

## 5. Сценарій Б — база й Redis у Docker, API локально

Зручніше для розробки (watch-режим).

1. У `.env` хост бази — `localhost`.
2. Підняти тільки інфраструктуру:
   ```bash
   docker compose up -d postgres redis
   ```
3. Встановити залежності, згенерувати клієнт і накотити міграції:
   ```bash
   pnpm install
   npm run db:generate
   npm run db:migrate:deploy
   ```
4. За потреби — сиди:
   ```bash
   npx ts-node -r tsconfig-paths/register prisma/seed.ts
   ```
5. Запустити:
   ```bash
   npm run start:dev
   ```

Контейнер `api` і `start:dev` обидва займають порт 4000 — одночасно їх не запустити. Якщо `api` вже працює: `docker compose stop api`.

---

## 6. Що доступно після запуску

| Адреса | Що це |
|---|---|
| `http://localhost:4000/api/v1/...`, `http://localhost:4000/api/v2/...` | REST API (глобальний префікс `/api` + версія в URI) |
| `http://localhost:4000/health/liveness`, `/health/readiness` | health-перевірки (без `/api` і без версії) |
| `http://localhost:4000/api/docs` | Swagger UI (якщо `SWAGGER_ENABLED=true`) |
| `http://localhost:4000/api/docs-json` | OpenAPI JSON |
| `ws://localhost:4000` | Socket.IO (чат, задачі, сповіщення) |
| `localhost:5432` | PostgreSQL — для DBeaver/pgAdmin/psql з `POSTGRES_*` |
| `localhost:6379` | Redis |

Авторизація — через httpOnly cookie `accessToken` / `refreshToken`, які ставить `POST /api/v1/auth/login`.

### Тестові користувачі із сидів

Пароль у всіх — `Password123!`:

- `admin@example.com` — роль `ADMIN`
- `test-uk@example.com`, `test-de@example.com`, `test-fr@example.com`

Тільки для локальної розробки — на спільних середовищах сиди не запускаються.

Підключитись до бази з консолі:

```bash
docker exec -it doogood_app_postgres psql -U postgres -d app_db
```

---

## 7. Корисні команди

```bash
docker compose ps                    # стан контейнерів і healthcheck
docker compose logs -f api           # логи API
docker compose restart api           # перезапуск без перезбірки
docker compose up -d --build api     # перезібрати API після змін у коді
docker compose stop                  # зупинити, дані лишаються
docker compose down                  # видалити контейнери, volume лишаються
docker compose down -v               # видалити контейнери І дані бази/Redis (повний скид)
```

---

## 8. Типові проблеми

| Симптом | Причина / рішення |
|---|---|
| `api` перезапускається, у логах `P1001: Can't reach database server at localhost:5432` | у `.env` для сценарію А хост має бути `postgres`, не `localhost` |
| `P1000: Authentication failed` | `DATABASE_URL` не збігається з `POSTGRES_*`, або volume створено зі старими кредами → `docker compose down -v` і знову `up` |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | на хості вже працює інший Postgres (або 6379 / 4000 зайняті) — зупиніть його або змініть ліву частину порту в `docker-compose.yaml` (тоді й порт у `DATABASE_URL` для сценарію Б) |
| `Configuration key "JWT_ACCESS_SECRET" does not exist` (або `SMTP_*`, `PORT`) | змінна відсутня чи порожня в `.env` |
| API в контейнері стартує, але `localhost:4000` не відповідає | `PORT` у `.env` не `4000` — compose прокидує лише `4000:4000` |
| Логін успішний, але cookie не зберігаються | `NODE_ENV=production` вимагає HTTPS; локально ставте `development` |
| CORS-помилка у фронтенді | `FRONTEND_URL` не збігається з адресою фронтенду (протокол + хост + порт, без `/` в кінці) |
