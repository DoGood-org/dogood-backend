import { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildSwaggerSpec() {
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
          // url: process.env.NEXT_PUBLIC_API_URL || `http://localhost:${PORT}`,
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
    },
    apis: [
      path.resolve(__dirname, '../docs/*.yaml'),
    ],
  };

  return swaggerJSDoc(swaggerOptions);
}


export const setupSwagger = (app: Express): void => {
  const swaggerSpec = buildSwaggerSpec();

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/swagger.json', (_, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};