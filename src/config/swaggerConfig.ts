import { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
          // url: `http://18.144.34.140:${PORT}`,
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
    },
    apis: [
      path.resolve(__dirname, '../docs/*.yaml'), // path to yaml files
    ],
  };

  const swaggerSpec = swaggerJSDoc(swaggerOptions);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // JSON доступ до swagger.json
  app.get('/swagger.json', (_, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
