import request from 'supertest';
const BASE_URL = 'http://localhost:5000';

describe('Tasks API', () => {
    test('Should create a task', async () => {
        const response = await request(BASE_URL)
            .post('/tasks')
            .send({
                title: "Тест Оксани",
                description: "Перевірка через TS",
                points: 10,
                organizationId: "937f9740-6f27-4752-ba11-592fd8a8832c"
            });
        expect(response.status).toBe(201);
    }); 
}); 