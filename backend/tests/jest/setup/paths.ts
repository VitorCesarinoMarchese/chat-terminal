import { resolve } from "node:path";

const TEST_DB_FILE_ENV = "JEST_TEST_DB_FILE";

export function getTestTmpDirPath() {
  return resolve(process.cwd(), "tests/.tmp");
}

function getTestDbFileName() {
  if (!process.env[TEST_DB_FILE_ENV]) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    process.env[TEST_DB_FILE_ENV] = `jest-test-${suffix}.db`;
  }

  return process.env[TEST_DB_FILE_ENV]!;
}

export function getTestDbPath() {
  return resolve(getTestTmpDirPath(), getTestDbFileName());
}

export function getTestDbUrl() {
  return `file:${getTestDbPath()}`;
}

export function getTestDbArtifacts() {
  const dbPath = getTestDbPath();
  return [dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`];
}
