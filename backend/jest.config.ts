import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/jest/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/jest/setup/env.ts"],
  globalSetup: "<rootDir>/tests/jest/setup/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/jest/setup/globalTeardown.ts",
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  verbose: true,
  maxWorkers: 1,
  testTimeout: 15000,
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
        diagnostics: false,
      },
    ],
  },
};

export default config;
