import { mkdirSync } from "node:fs";
import { getTestDbUrl, getTestTmpDirPath } from "./paths";

export function configureTestEnvironment() {
  mkdirSync(getTestTmpDirPath(), { recursive: true });

  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "jest-access-secret";
  process.env.JWT_REFRESH_SECRET = "jest-refresh-secret";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.DATABASE_URL = getTestDbUrl();
}

configureTestEnvironment();
