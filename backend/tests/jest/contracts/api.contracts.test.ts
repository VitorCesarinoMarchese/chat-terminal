import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { USERS } from "../fixtures/users";
import { registerUser } from "../setup/auth";
import { disconnectTestDatabase } from "../setup/db";
import { getJson, postJson, readJson } from "../setup/http";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

type ApiError = {
  success: false;
  error: string;
};

function uniqueUsername(prefix: string) {
  return `${prefix}-contracts-${randomUUID().slice(0, 8)}`;
}

describe("API contracts", () => {
  let running: RunningTestServer;

  beforeAll(async () => {
    running = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer(running);
    await disconnectTestDatabase();
  });

  it("auth register success returns standardized success shape", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/auth/register", {
      username: uniqueUsername("register-success"),
      password: USERS.alice.password,
    });
    const body = await readJson<
      ApiSuccess<{ accessToken: string; refreshToken: string }> & {
        accessToken?: string;
        refreshToken?: string;
      }
    >(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(typeof body.message).toBe("string");
    expect(typeof body.data.accessToken).toBe("string");
    expect(typeof body.data.refreshToken).toBe("string");
  });

  it("auth register error returns standardized error shape", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/auth/register", {
      username: uniqueUsername("register-error"),
    });
    const body = await readJson<ApiError>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("friend send covers success and auth error contract shapes", async () => {
    const sender = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("friend-sender"),
      USERS.alice.password
    );
    const receiver = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("friend-receiver"),
      USERS.bob.password
    );

    const successResponse = await postJson(
      running.baseHttpUrl,
      "/api/friend/send",
      { senderUsername: sender.username, receiverUsername: receiver.username },
      sender.accessToken
    );
    const successBody = await readJson<ApiSuccess<{ request: { id: number; status: string } }>>(
      successResponse
    );

    expect(successResponse.status).toBe(201);
    expect(successBody.success).toBe(true);
    expect(typeof successBody.message).toBe("string");
    expect(typeof successBody.data.request.id).toBe("number");

    const unauthorizedResponse = await postJson(running.baseHttpUrl, "/api/friend/send", {
      senderUsername: sender.username,
      receiverUsername: receiver.username,
    });
    const unauthorizedBody = await readJson<ApiError>(unauthorizedResponse);

    expect(unauthorizedResponse.status).toBe(401);
    expect(unauthorizedBody.success).toBe(false);
    expect(typeof unauthorizedBody.error).toBe("string");
  });

  it("chat all edge path returns standardized success shape with empty list", async () => {
    const user = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("chat-empty"),
      USERS.alice.password
    );
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/all?username=${user.username}`,
      user.accessToken
    );
    const body = await readJson<ApiSuccess<{ userChats: unknown[] }>>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.message).toBe("string");
    expect(Array.isArray(body.data.userChats)).toBe(true);
    expect(body.data.userChats).toHaveLength(0);
  });
});

