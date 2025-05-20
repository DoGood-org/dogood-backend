import { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

export const setupSwagger = (app: Express): void => {
  const PORT = process.env.PORT || 5000;

  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'DoGood API',
        version: '1.0.0',
        description: 'DoGood Backend API Documentation',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
    },
    apis: ['./src/routes/api/*.ts'], // Путь к файлам с маршрутами
  };

  const swaggerSpec = swaggerJSDoc(swaggerOptions);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
