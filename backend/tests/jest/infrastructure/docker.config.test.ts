import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "@jest/globals";

function readRepoFile(relativePath: string) {
  const repoRoot = resolve(process.cwd(), "..");
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("docker configuration", () => {
  it("compose defines backend, postgres, and redis services with persistent volumes", () => {
    const compose = readRepoFile("docker-compose.yml");

    expect(compose).toContain("backend:");
    expect(compose).toContain("postgres:");
    expect(compose).toContain("redis:");
    expect(compose).toContain("postgres_data:");
    expect(compose).toContain("redis_data:");
  });

  it("backend compose service wires postgres + redis runtime envs", () => {
    const compose = readRepoFile("docker-compose.yml");

    expect(compose).toContain("schema.postgres.prisma");
    expect(compose).toContain("postgresql://postgres:postgres@postgres:5432/chat_terminal");
    expect(compose).toContain("REDIS_URL: ${REDIS_URL:-redis://redis:6379}");
  });

  it("backend Dockerfile includes dev and production targets", () => {
    const dockerfile = readRepoFile("backend/Dockerfile");

    expect(dockerfile).toContain("FROM base AS dev");
    expect(dockerfile).toContain("FROM node:20-alpine AS prod");
    expect(dockerfile).toContain('CMD ["npm", "run", "dev"]');
    expect(dockerfile).toContain('CMD ["npm", "run", "start"]');
  });

  it("postgres prisma schema is configured with DATABASE_URL env", () => {
    const schema = readRepoFile("backend/prisma/schema.postgres.prisma");

    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain('url      = env("DATABASE_URL")');
  });

  it("env example documents sqlite local and postgres docker URLs", () => {
    const envExample = readRepoFile("backend/.env.example");

    expect(envExample).toContain('DATABASE_URL="file:./dev.db"');
    expect(envExample).toContain("postgresql://postgres:postgres@postgres:5432/chat_terminal");
    expect(envExample).toContain('REDIS_URL="redis://localhost:6379"');
  });
});
