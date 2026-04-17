import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import jwt from "jsonwebtoken";
import * as jwtUtils from "../../../src/utils/jwtUtils";
import { USERS } from "../fixtures/users";
import { registerUser } from "../setup/auth";
import { postJson, readJson } from "../setup/http";
import { disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

type JwtResponse = {
  success?: boolean;
  data?: {
    accessToken?: unknown;
  };
  accessToken?: unknown;
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

describe("POST /api/auth/jwt", () => {
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

  it("returns 200 for already-valid access token", async () => {
    const session = await registerUser(
      running.baseHttpUrl,
      "alice-jwt-valid-access",
      USERS.alice.password
    );

    const response = await postJson(running.baseHttpUrl, "/api/auth/jwt", {
      token: session.accessToken,
      refreshToken: session.refreshToken,
      userId: session.userId,
    });
    const body = await readJson<JwtResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.accessToken).toBe(session.accessToken);
    expect(body.data?.accessToken).toBe(session.accessToken);
    expect(body.message).toBe("Your access token is validated successfully");
  });

  it("returns 400 for missing payload fields", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/auth/jwt", {
      token: "missing-fields",
    });
    const body = await readJson<JwtResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Missing data");
  });

  it("returns 401 when both tokens are invalid", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/auth/jwt", {
      token: "invalid-access-token",
      refreshToken: "invalid-refresh-token",
      userId: 999,
    });
    const body = await readJson<JwtResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Tokens invalid, please login again");
  });

  it("returns 401 when token userId does not match request userId", async () => {
    const session = await registerUser(
      running.baseHttpUrl,
      "alice-jwt-userid-mismatch",
      USERS.alice.password
    );

    const response = await postJson(running.baseHttpUrl, "/api/auth/jwt", {
      token: session.accessToken,
      refreshToken: session.refreshToken,
      userId: session.userId + 1,
    });
    const body = await readJson<JwtResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Tokens invalid, please login again");
  });

  it("returns 200 with string accessToken when only refresh token is valid", async () => {
    const session = await registerUser(
      running.baseHttpUrl,
      "bob-jwt-refresh-only",
      USERS.bob.password
    );

    const response = await postJson(running.baseHttpUrl, "/api/auth/jwt", {
      token: "invalid-access-token",
      refreshToken: session.refreshToken,
      userId: session.userId,
    });
    const body = await readJson<JwtResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.accessToken).toBe("string");
    expect(typeof body.data?.accessToken).toBe("string");
    expect(body.message).toBe("Generated new access token");
  });

  it("returns 500 for deterministic token generation failure", async () => {
    const session = await registerUser(
      running.baseHttpUrl,
      "bob-jwt-generate-token-failure",
      USERS.bob.password
    );

    jest.spyOn(jwtUtils, "generateAccessToken").mockImplementationOnce(() => {
      throw new Error("forced-generate-access-token-failure");
    });

    const response = await postJson(running.baseHttpUrl, "/api/auth/jwt", {
      token: "invalid-access-token",
      refreshToken: session.refreshToken,
      userId: session.userId,
    });
    const body = await readJson<JwtResponse>(response);

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Error generating a new access token");
  });

  it("returns 500 when token validation throws unexpectedly", async () => {
    const session = await registerUser(
      running.baseHttpUrl,
      "charlie-jwt-verify-failure",
      USERS.charlie.password
    );

    jest.spyOn(jwtUtils, "verifyAccessToken").mockImplementationOnce(() => {
      throw new Error("forced-verify-access-failure");
    });

    const response = await postJson(running.baseHttpUrl, "/api/auth/jwt", {
      token: session.accessToken,
      refreshToken: session.refreshToken,
      userId: decodeUserId(session.accessToken),
    });
    const body = await readJson<JwtResponse>(response);

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Internal server error");
  });
});
