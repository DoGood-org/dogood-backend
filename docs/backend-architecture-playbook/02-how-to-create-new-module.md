# Як заводити новий модуль

Цей гайд описує правильний спосіб додавання нового feature-модуля в поточній архітектурі.

## 1) Коли створювати новий модуль

Створюй окремий модуль, якщо:

- з’явилась нова бізнес-область (наприклад `organization`, `task`, `review`),
- у фічі є власні ендпоінти + сервіси + DTO,
- логіка вже не вкладається в існуючі `auth`/`user` без порушення SRP.

## 2) Рекомендована структура

Приклад для `organization`:

```text
src/organization/
├── controllers/
│   └── organization.controller.ts
├── services/
│   └── organization.service.ts
├── dto/
│   ├── create-organization.dto.ts
│   └── update-organization.dto.ts
└── organization.module.ts
```

## 3) Покроковий процес

### Крок 1. Створи модульні файли

- `organization.module.ts`
- `controllers/organization.controller.ts`
- `services/organization.service.ts`
- DTO в `dto/`

### Крок 2. Підключи залежності в модулі

Стандартно для поточного проєкту:

- імпортувати `DatabaseModule` (для `PrismaService`),
- імпортувати `SharedModule` (якщо потрібні токени/хеш/email/cookies),
- зареєструвати контролер і сервіс.

Типовий шаблон:

```ts
@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService], // якщо сервіс потрібен в інших модулях
})
export class OrganizationModule {}
```

### Крок 3. Додай модуль у `AppModule`

У `src/app.module.ts`:

- імпортуй `OrganizationModule`,
- додай у масив `imports`.

Без цього Nest не підніме маршрути модуля.

### Крок 4. DTO + валідація

У проєкті вже є конвенція: `zod` + `createZodDto`.

- створюй схему `const ...Schema = z.object(...)`,
- експортуй DTO-клас через `createZodDto(...)`,
- у контролері використовуй `new ZodValidationPipe(schema)` на `@Body()`.

### Крок 5. Розділи обов’язки controller/service

- `Controller`: HTTP-рівень (параметри, body, status codes, response wrapper).
- `Service`: бізнес-правила, транзакції, взаємодія з Prisma.

### Крок 6. Перевір доступність endpoint-ів

Пам’ятай, що в проєкті глобально активний `AuthGuard`:

- усі endpoint-и приватні за замовчуванням,
- якщо endpoint має бути публічним — додай `@Public()`.

### Крок 7. Тести/мінімальна верифікація

Мінімум після додавання:

- `pnpm run build`
- `pnpm run lint`

(або локально хоча б `build`, якщо lint ще в процесі налаштування).

## 4) Практичний чекліст PR для нового модуля

- [ ] Є окрема папка `src/<module>`.
- [ ] Є `module`, `controller`, `service`, `dto`.
- [ ] Модуль підключений у `AppModule`.
- [ ] DTO валідовані через Zod.
- [ ] Бізнес-логіка не винесена в контролер.
- [ ] Визначено, які endpoint-и public, а які protected.
- [ ] Якщо з’явилась спільна технічна логіка — оцінено перенос у `shared`.

## 5) Часті помилки

1. Забули додати модуль у `AppModule`.
2. Засунули важку бізнес-логіку в контролер.
3. Дублюють helper/service у кількох модулях замість винесення в `shared`.
4. Додають у `shared` доменну логіку (це неправильно; деталі в окремому гайді).
