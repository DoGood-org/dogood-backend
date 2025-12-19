// __tests__/auth.e2e.test.ts

// ----------------------------------------------------
// 1. ІМПОРТИ ТА ІНІЦІАЛІЗАЦІЯ
// ----------------------------------------------------
import request from 'supertest';
import appModule from '../src/app'; 
import { prisma } from '../src/lib/prisma'; // Імпорт Prisma для очищення БД
import { Server } from 'http'; 

const { app, server } = appModule; 
let listener: Server; 

// ----------------------------------------------------
// 2. ТЕСТОВІ ДАНІ
// ----------------------------------------------------
const MOCK_USER_DATA = {
    email: 'testuser-e2e@example.com', 
    password: 'SecurePassword123',
    name: 'E2E Test User',
};

// ----------------------------------------------------
// 3. ГЛОБАЛЬНЕ НАЛАШТУВАННЯ ТЕСТОВОГО СЕРВЕРА
// ----------------------------------------------------

// Запуск сервера перед УСІМА тест-сьютами
beforeAll((done) => {
    listener = server.listen(0, () => { 
        done(); 
    }) as unknown as Server; 
});

// Закриття сервера після УСІХ тест-сьютів
afterAll((done) => {
    listener.close(done); 
});

// ----------------------------------------------------
// 4. ТЕСТОВИЙ НАБІР ДЛЯ АВТЕНТИФІКАЦІЇ (describe)
// ----------------------------------------------------
describe('Auth E2E Tests', () => {

    // 🌟 ЗМІНА: Очищаємо та створюємо користувача ПЕРЕД КОЖНИМ тестом
    beforeEach(async () => {
        // 1. Очищаємо базу даних від попередніх запусків та від попередніх тестів
        await prisma.user.deleteMany({ 
            where: { email: MOCK_USER_DATA.email }, 
        });

        // 2. Створюємо користувача для використання в поточному тесті
        await request(server)
            .post('/auth/signup')
            .send(MOCK_USER_DATA);
    });

    // 🌟 ЗМІНА: Видаляємо користувача ПІСЛЯ КОЖНОГО тесту
    afterEach(async () => {
        await prisma.user.deleteMany({ 
            where: { email: MOCK_USER_DATA.email }, 
        });
    });


    // =======================================================
    // ТЕСТ 2.1: Перевірка запуску сервера
    // =======================================================
    test('Placeholder: Сервер успішно запущено', () => {
        expect(server).toBeDefined();
        expect(request(server)).toBeDefined(); 
    });

    // =======================================================
    // 2.2.1: Реєстрація (Перевірка на конфлікт)
    // =======================================================
    test('2.2.1: POST /auth/signup повинен повернути помилку при спробі повторної реєстрації', async () => {
        const response = await request(server)
            .post('/auth/signup')
            .send(MOCK_USER_DATA);

        expect(response.statusCode).not.toBe(201); 
        expect([400, 409]).toContain(response.statusCode);
    });

    // =======================================================
    // 2.2.2: Тест логіну (Повинен бути успішним)
    // =======================================================
    test('2.2.2: POST /auth/login повинен успішно увійти в систему (200) та повернути дані користувача', async () => {
        
        const response = await request(server)
            .post('/auth/login')
            .send({
                email: MOCK_USER_DATA.email, 
                password: MOCK_USER_DATA.password,
            });

        expect(response.statusCode).toBe(200); 
        expect(response.body).toHaveProperty('id');
    });


    // =======================================================
    // 2.2.3: Тест неіснуючого користувача
    // =======================================================
    test('2.2.3: POST /auth/login повинен повернути 401 для неіснуючого користувача', async () => {
        const response = await request(server)
            .post('/auth/login')
            .send({
                email: 'nonexistent-e2e@example.com', 
                password: 'AnyPassword123',
            });

        // ❌ ПОМИЛКА API (має бути 401, отримуємо 400)
        expect(response.statusCode).toBe(401); 
        expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

    // =======================================================
    // 2.2.4: Тест невірного пароля
    // =======================================================
    test('2.2.4: POST /auth/login повинен повернути 401 для невірного пароля', async () => {
        const response = await request(server)
            .post('/auth/login')
            .send({
                email: MOCK_USER_DATA.email, 
                password: 'WrongPasswordForE2E', 
            });

        // ❌ ПОМИЛКА API (має бути 401, отримуємо 400)
        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

    // =======================================================
    // 3.3: Тест Logout
    // =======================================================
    test('3.3: POST /auth/logout should clear token cookies and return 204', async () => {
        
        // 1. Успішний логін для отримання сесії з куками (token, refreshToken)
        const agent = request.agent(server);
        const loginResponse = await agent
            .post('/auth/login')
            .send({
                email: MOCK_USER_DATA.email,
                password: MOCK_USER_DATA.password,
            });

        // 🟢 ЦЯ ПЕРЕВІРКА ТЕПЕР ПОВИННА БУТИ УСПІШНОЮ (200) завдяки ізоляції.
        expect(loginResponse.statusCode).toBe(200); 
        
        // 2. Виклик Logout за допомогою тієї ж сесії (agent)
        const logoutResponse = await agent
            .post('/auth/logout')
            .send(); 

        // 3. Перевірка HTTP-статусу
        expect(logoutResponse.statusCode).toBe(204);

        // 4. Перевірка очищення куків
        const rawCookies = logoutResponse.headers['set-cookie'] as string | string[] | undefined; // ⬅️ Змінюємо тут
        const cookies = Array.isArray(rawCookies) 
            ? rawCookies 
            : (rawCookies ? [rawCookies] : []); 

        expect(cookies.length).toBeGreaterThanOrEqual(2); 

        // Перевірка, що 'token' очищено
        expect(cookies.some((c: string) => c.startsWith('token=') && (c.includes('Max-Age=0') || c.includes('Expires=')))).toBe(true);

        // Перевірка, що 'refreshToken' очищено
        expect(cookies.some((c: string) => c.startsWith('refreshToken=') && (c.includes('Max-Age=0') || c.includes('Expires=')))).toBe(true);
    });

});