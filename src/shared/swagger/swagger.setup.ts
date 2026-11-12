// Target location: src/shared/swagger/swagger.setup.ts
//
// Wiring in src/main.ts — after setGlobalPrefix / enableVersioning, before app.listen:
//
//   import { setupSwagger } from '@shared/swagger/swagger.setup';
//
//   if (config.get<string>('SWAGGER_ENABLED') === 'true') {
//     setupSwagger(app);
//   }
//
// .env / .env.example: SWAGGER_ENABLED=true (leave unset on production).
// UI: http://localhost:3000/api/docs · JSON: http://localhost:3000/api/docs-json

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

const SWAGGER_PATH = 'api/docs';
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

// NOTE: tags come from the path (/api/v1/auth/... → "auth v1"), so controllers need no @ApiTags.
const tagOperationsByModule = (document: OpenAPIObject): OpenAPIObject => {
  for (const [path, item] of Object.entries(document.paths)) {
    const match = /^\/api\/(v\d+)\/([^/]+)/.exec(path);
    const tag = match ? `${match[2]} ${match[1]}` : path.split('/')[1];

    for (const method of HTTP_METHODS) {
      const operation = item[method];

      if (operation) {
        operation.tags = [tag];
      }
    }
  }

  return document;
};

// NOTE: request fields are not described by hand — every createZodDto class exposes its zod schema to
// @nestjs/swagger, and cleanupOpenApiDoc turns those schemas into plain OpenAPI.
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('DoGood API')
    .setVersion('1.0')
    .addCookieAuth('accessToken')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(
    SWAGGER_PATH,
    app,
    cleanupOpenApiDoc(tagOperationsByModule(document)),
    {
      swaggerOptions: { withCredentials: true, persistAuthorization: true },
    },
  );
}
