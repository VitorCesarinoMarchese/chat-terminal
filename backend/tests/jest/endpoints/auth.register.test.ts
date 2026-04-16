import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import jwt from "jsonwebtoken";
import { USERS } from "../fixtures/users";
import { mockRejectedOnce } from "../setup/faultInjection";
import { postJson, readJson } from "../setup/http";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

type RegisterResponse = {
  accessToken?: string;
  refreshToken?: string;
  message?: string;
  error?: string;
};

function decodeUserId(token: string) {
  const decoded = jwt.decode(token) as jwt.JwtPayload | null;
  if (!decoded || typeof decoded.userId !== "number") {
    throw new Error("Invalid auth token payload");
  }
  return decoded.userId;
}

describe("POST /api/auth/register", () => {
  let running: RunningTestServer;

  beforeAll(async () => {
    running = await startTestServer();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await stopTestServer(running);
    await disconnectTestDatabase();
  });

  it("returns 201 and tokens for valid registration", async () => {
    const username = "alice-register-success";
    const response = await postJson(running.baseHttpUrl, "/api/auth/register", {
      username,
      password: USERS.alice.password,
    });
    const body = await readJson<RegisterResponse>(response);

    expect(response.status).toBe(201);
    expect(body.message).toBe(`User ${username} created suscessufuly`);
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));

    const userId = decodeUserId(body.accessToken as string);
    const user = await db.user.findUnique({ where: { id: userId } });
    expect(user).not.toBeNull();
    expect(user?.username).toBe(username);
    expect(user?.password).not.toBe(USERS.alice.password);
  });

  it("returns 400 when username or password is missing", async () => {
    const missingPassword = await postJson(running.baseHttpUrl, "/api/auth/register", {
      username: USERS.alice.username,
    });
    const missingPasswordBody = await readJson<RegisterResponse>(missingPassword);

    expect(missingPassword.status).toBe(400);
    expect(missingPasswordBody.error).toBe("Missing data");

    const missingUsername = await postJson(running.baseHttpUrl, "/api/auth/register", {
      password: USERS.alice.password,
    });
    const missingUsernameBody = await readJson<RegisterResponse>(missingUsername);

    expect(missingUsername.status).toBe(400);
    expect(missingUsernameBody.error).toBe("Missing data");
  });

  it("returns 400 when username is an empty string", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/auth/register", {
      username: "",
      password: USERS.alice.password,
    });
    const body = await readJson<RegisterResponse>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing data");
  });

  it("returns 406 for duplicate usernames", async () => {
    const username = "alice-register-duplicate";
    await postJson(running.baseHttpUrl, "/api/auth/register", {
      username,
      password: USERS.alice.password,
    });

    const duplicateResponse = await postJson(running.baseHttpUrl, "/api/auth/register", {
      username,
      password: USERS.alice.password,
    });
    const duplicateBody = await readJson<RegisterResponse>(duplicateResponse);

    expect(duplicateResponse.status).toBe(406);
    expect(duplicateBody.error).toBe("Username already in use");
  });

  it("returns 500 for deterministic DB failure", async () => {
    mockRejectedOnce(db.user, "findUnique", "register-findUnique-failure");

    const response = await postJson(running.baseHttpUrl, "/api/auth/register", {
      username: USERS.bob.username,
      password: USERS.bob.password,
    });
    const body = await readJson<RegisterResponse>(response);

    expect(response.status).toBe(500);
    expect(body.error).toBe("Server erros");
  });
});
