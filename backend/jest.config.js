module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: false, // No usar tsconfig.json para evitar referencia circular
      compilerOptions: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
        target: 'ES2020',
        moduleResolution: 'node',
      }
    }]
  },
  testTimeout: 10000,
  moduleNameMapper: {}
}

