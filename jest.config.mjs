import { createDefaultPreset, pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tsconfigRaw = readFileSync(`${__dirname}/tsconfig.json`, 'utf-8');
const { compilerOptions } = JSON.parse(tsconfigRaw);

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/src/', 
  }),
  roots: ['<rootDir>/src'],
  verbose: true,
  clearMocks: true,
  transformIgnorePatterns: ['/node_modules/'],
};
