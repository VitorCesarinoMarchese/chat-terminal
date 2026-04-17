import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import jwt from "jsonwebtoken";
import { USERS } from "../fixtures/users";
import { registerUser } from "../setup/auth";
import { mockRejectedOnce } from "../setup/faultInjection";
import { postJson, readJson } from "../setup/http";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

type LoginResponse = {
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

describe("POST /api/auth/login", () => {
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

  it("returns 202 and tokens for valid credentials", async () => {
    const username = "alice-login-success";
    const registered = await registerUser(running.baseHttpUrl, username, USERS.alice.password);

    const response = await postJson(running.baseHttpUrl, "/api/auth/login", {
      username,
      password: USERS.alice.password,
    });
    const body = await readJson<LoginResponse>(response);

    expect(response.status).toBe(202);
    expect(body.message).toBe(`User ${username} logged suscessufuly`);
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(body.accessToken).not.toBe(body.refreshToken);

    const accessUserId = decodeUserId(body.accessToken as string);
    const refreshUserId = decodeUserId(body.refreshToken as string);
    expect(accessUserId).toBe(registered.userId);
    expect(refreshUserId).toBe(registered.userId);
  });

  it("returns 400 when username or password is missing", async () => {
    const missingPassword = await postJson(running.baseHttpUrl, "/api/auth/login", {
      username: USERS.alice.username,
    });
    const missingPasswordBody = await readJson<LoginResponse>(missingPassword);

    expect(missingPassword.status).toBe(400);
    expect(missingPasswordBody.error).toBe("Missing data");

    const missingUsername = await postJson(running.baseHttpUrl, "/api/auth/login", {
      password: USERS.alice.password,
    });
    const missingUsernameBody = await readJson<LoginResponse>(missingUsername);

    expect(missingUsername.status).toBe(400);
    expect(missingUsernameBody.error).toBe("Missing data");
  });

  it("returns 400 when password is an empty string", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/auth/login", {
      username: USERS.alice.username,
      password: "",
    });
    const body = await readJson<LoginResponse>(response);

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing data");
  });

  it("returns 404 when user does not exist", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/auth/login", {
      username: "charlie-login-missing",
      password: USERS.charlie.password,
    });
    const body = await readJson<LoginResponse>(response);

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });

  it("returns 401 for invalid password", async () => {
    const username = "alice-login-invalid-password";
    await registerUser(running.baseHttpUrl, username, USERS.alice.password);

    const response = await postJson(running.baseHttpUrl, "/api/auth/login", {
      username,
      password: "wrong-password",
    });
    const body = await readJson<LoginResponse>(response);

    expect(response.status).toBe(401);
    expect(body.error).toBe("Incorrect password");
  });

  it("returns 500 for deterministic DB failure", async () => {
    mockRejectedOnce(db.user, "findUnique", "login-findUnique-failure");

    const response = await postJson(running.baseHttpUrl, "/api/auth/login", {
      username: USERS.alice.username,
      password: USERS.alice.password,
    });
    const body = await readJson<LoginResponse>(response);

    expect(response.status).toBe(500);
    expect(body.error).toBe("Server erros");
  });
});
