/** @type {import('jest').Config} */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/api/setup.ts'],
  passWithNoTests: true,
  coverageProvider: 'v8',
  // Next.js App Router + ESM support
  transform: {},
  extensionsToTreatAsEsm: [],
  // Open handles are now properly cleaned up via shared server lifecycle in setup.ts.
  // No forceExit needed when server teardown is correctly implemented.
  forceExit: false,
})