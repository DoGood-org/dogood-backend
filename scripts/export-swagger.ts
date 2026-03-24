import fs from 'node:fs/promises';
import path from 'node:path';
import { buildSwaggerSpec } from "../src/config/swaggerConfig";

async function main() {
  const spec = buildSwaggerSpec();

  const outputDir = path.resolve(process.cwd(), 'artifacts/openapi');
  const outputFile = path.join(outputDir, 'swagger.json');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(spec, null, 2), 'utf-8');

  console.log(`Swagger exported to ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});