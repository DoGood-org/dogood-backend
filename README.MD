# DoGood Backend

Backend API для проєкту **DoGood**, побудований на **NestJS** з використанням **Prisma** та **PostgreSQL**.

## Що є в проєкті

- **NestJS** — основний backend framework
- **Prisma** — доступ до БД та міграції
- **PostgreSQL** — основна база даних
- **Redis** — піднятий у `docker-compose` як допоміжний сервіс
- **PNPM** — пакетний менеджер
- **JWT auth**, cookies, email-відправка через SMTP

На поточний момент у коді є основні модулі:

- `src/auth` — авторизація / реєстрація
- `src/user` — робота з користувачем
- `src/shared` — спільні сервіси, guard-логіка, шаблони email тощо
- `src/database` — інтеграція з Prisma

Додаток стартує з глобальним префіксом `api`, тобто локально API буде доступне за адресою:

```text
http://localhost:3000/api
```

---

## Вимоги

Для локальної розробки знадобиться:

- **Node.js 22+**
- **pnpm**
- **Docker + Docker Compose** — якщо хочете швидко підняти PostgreSQL / Redis локально

> Примітка: у репозиторії використовуються сучасні Node-оточення (`node:22` / `node:24` у CI та Docker), тому краще тримати локально актуальну LTS-версію Node.js.

---

## Швидкий старт

### 1. Встановити залежності

```bash
pnpm install
```

### 2. Створити `.env`

Скопіюйте приклад конфігурації:

```bash
cp .env.example .env
```

### 3. Заповнити змінні середовища

Мінімально для локального запуску потрібні:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_db?schema=public
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=DoGood <noreply@dogood.com>
```

### 4. Підняти базу даних та Redis

```bash
docker compose up -d postgres redis
```

За замовчуванням `docker-compose.yaml` піднімає:

- `postgres` на `localhost:5432`
- `redis` на `localhost:6379`

### 5. Згенерувати Prisma client

```bash
pnpm run db:generate
```

### 6. Застосувати міграції

```bash
pnpm run db:migrate
```

### 7. Запустити бекенд

```bash
pnpm run start:dev
```

Після старту API буде доступне тут:

```text
http://localhost:3000/api
```

---

## Запуск у Docker

Якщо потрібно підняти весь стек через Docker:

```bash
docker compose up --build
```

У цьому випадку:

- `api` стартує з `.env`
- `postgres` і `redis` також стартують із compose-конфігурації

> Для поточної локальної конфігурації орієнтуйтесь передусім на `.env.example`. Саме ці змінні реально використовуються поточним backend-кодом.

---

## Робота з міграціями Prisma

У проєкті використовується `Prisma`.

### Застосувати міграції локально

```bash
pnpm run db:migrate
```

Ця команда запускає:

```bash
prisma migrate dev
```

Вона підходить для локальної розробки: створює / застосовує міграції та синхронізує схему.

### Застосувати міграції на staging / production

```bash
pnpm run db:migrate:deploy
```

Ця команда запускає:

```bash
prisma migrate deploy
```

Використовуйте її там, де вже існують готові міграції і не потрібно створювати нові.

### Згенерувати Prisma client

```bash
pnpm run db:generate
```

Корисно запускати після:

- зміни `prisma/schema.prisma`
- підтягування нових міграцій із репозиторію
- оновлення залежностей Prisma

### Як створити нову міграцію

1. Внести зміни у `prisma/schema.prisma`
2. Запустити команду:

```bash
pnpm exec prisma migrate dev --name short_description
```

Приклад:

```bash
pnpm exec prisma migrate dev --name add_user_profile_fields
```

Після цього Prisma:

- згенерує нову міграцію в `prisma/migrations/`
- застосує її локально
- оновить Prisma Client

### Якщо потрібно повністю скинути локальну БД

> Обережно: команда нижче видаляє локальні дані.

```bash
pnpm exec prisma migrate reset
```

Використовуйте тільки для локальної розробки, коли потрібно почати зі «свіжої» БД.

---

## Основні скрипти

### Розробка

```bash
pnpm run start
pnpm run start:dev
pnpm run start:debug
pnpm run start:prod
```

### Якість коду

```bash
pnpm run lint
pnpm run format
```

### Тести

```bash
pnpm run test
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e
```

### База даних

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:migrate:deploy
```

---

## Структура директорій

```text
src/
  auth/        авторизація та аутентифікація
  user/        робота з користувачами
  shared/      спільні сервіси, guards, templates
  database/    Prisma service / database module
prisma/
  schema.prisma
  migrations/
docs/
  backend-architecture-playbook/
test/
  e2e та інші тести
```

Додаткова архітектурна документація знаходиться тут:

- `docs/backend-architecture-playbook/README.md`

---

## Workflow по гілках

Нижче — рекомендований робочий процес для команди. Він добре узгоджується з поточною структурою репозиторію, де основною інтеграційною гілкою є `develop`.

### Призначення гілок

- `develop` — основна гілка активної розробки
- `main` — стабільна / production-ready гілка
- `feature/<name>` — нова функціональність
- `bugfix/<name>` — виправлення багів
- `hotfix/<name>` — термінові виправлення для production

> У remote також є гілка `review`, але її роль варто уточнювати в команді. Якщо окремого процесу для неї немає, базовий workflow можна будувати навколо `develop` і `main`.

### Базовий сценарій: feature → PR → review → merge

#### 1. Створити гілку від `develop`

```bash
git checkout develop
git pull origin develop
git checkout -b feature/add-user-profile
```

#### 2. Реалізувати задачу

Під час роботи бажано:

- робити невеликі логічні коміти
- не змішувати в одному PR рефакторинг і нову функціональність без потреби
- якщо змінюється схема БД — додати Prisma migration
- якщо змінюється поведінка API — оновити документацію / опис у PR

#### 3. Перед пушем перевірити локально

```bash
pnpm run lint
pnpm run test
```

Якщо змінювалась Prisma schema:

```bash
pnpm run db:generate
pnpm run db:migrate
```

#### 4. Запушити гілку

```bash
git push origin feature/add-user-profile
```

#### 5. Створити Pull Request у `develop`

У PR бажано вказати:

- **що зроблено**
- **чому це потрібно**
- **що перевірити під час review**
- **чи є зміни в БД / міграції**
- **чи потрібні нові env-змінні**

#### 6. Code Review

Під час review перевіряємо:

- чи немає зайвих змін
- чи дотримана структура модулів
- чи коректно оформлені DTO / validation / guards
- чи не ламає зміна існуючий API
- чи додані міграції, якщо змінювалась схема БД

#### 7. Внести правки після review

Після коментарів рев’юера:

```bash
git add .
git commit -m "address review comments"
git push origin feature/add-user-profile
```

#### 8. Merge у `develop`

Після апруву PR зливається в `develop`.

Стратегія merge (`merge commit`, `squash`, `rebase`) — за домовленістю команди, але важливо зберігати читабельну історію.

#### 9. Після релізної стабілізації — merge у `main`

Коли зміни перевірені на `develop`, їх можна переносити в `main` як стабільну версію.

---

## Що перевіряти в PR окремо

Особливо звертайте увагу на такі речі:

- нові env-змінні задокументовані
- Prisma migration присутня в коміті
- немає випадкових змін у несуміжних файлах
- бізнес-логіка не винесена в контролер без потреби
- shared-код не дублює існуючі сервіси / util-функції

---

## Корисні нотатки

- Backend читає env-файли через `ConfigModule.forRoot(...)`
- Для CORS використовується `FRONTEND_URL`
- Додаток слухає порт із `PORT`
- Prisma підключається через `DATABASE_URL`
- Email-сервіс використовує `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- JWT використовує `JWT_ACCESS_SECRET` і `JWT_REFRESH_SECRET`

---

## Корисні команди

### Підняти лише інфраструктуру

```bash
docker compose up -d postgres redis
```

### Зупинити інфраструктуру

```bash
docker compose down
```

### Перебудувати контейнер API

```bash
docker compose up --build api
```

---

## Контакти з архітектурою проєкту

Перед великими змінами варто переглянути:

- `docs/backend-architecture-playbook/README.md`

Це допоможе тримати код узгодженим зі структурою проєкту.
