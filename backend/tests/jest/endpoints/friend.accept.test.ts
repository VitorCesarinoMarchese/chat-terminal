import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { USERS } from "../fixtures/users";
import { registerUser } from "../setup/auth";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { mockRejectedOnce } from "../setup/faultInjection";
import { postJson, readJson } from "../setup/http";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

async function createPendingRequest(baseUrl: string) {
  const alice = await registerUser(baseUrl, USERS.alice.username, USERS.alice.password);
  const bob = await registerUser(baseUrl, USERS.bob.username, USERS.bob.password);

  const inviteResponse = await postJson(
    baseUrl,
    "/api/friend/send",
    { senderUsername: USERS.alice.username, receiverUsername: USERS.bob.username },
    alice.accessToken
  );
  const inviteBody = await readJson<{ request?: { id?: number } }>(inviteResponse);
  if (inviteResponse.status !== 201 || typeof inviteBody.request?.id !== "number") {
    throw new Error(
      `createPendingRequest failed (${inviteResponse.status}): ${JSON.stringify(inviteBody)}`
    );
  }
  return { requestId: inviteBody.request.id, alice, bob };
}

describe("POST /api/friend/accept", () => {
  let running: RunningTestServer;

  beforeAll(async () => {
    running = await startTestServer();
    await db.$connect();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await stopTestServer(running);
    await disconnectTestDatabase();
  });

  it("returns 200 when receiver accepts request", async () => {
    const { requestId, bob } = await createPendingRequest(running.baseHttpUrl);

    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/accept",
      { requestId, username: bob.username },
      bob.accessToken
    );

    expect(response.status).toBe(200);
  });

  it("returns 400 for missing required fields", async () => {
    const bob = await registerUser(running.baseHttpUrl, USERS.bob.username, USERS.bob.password);
    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/accept",
      { username: bob.username },
      bob.accessToken
    );

    expect(response.status).toBe(400);
  });

  it("returns 401 when auth token is missing", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/friend/accept", {
      requestId: 1,
      username: USERS.bob.username,
    });
    expect(response.status).toBe(401);
  });

  it("returns 401 for token/username authorization mismatch", async () => {
    const { requestId } = await createPendingRequest(running.baseHttpUrl);
    const charlie = await registerUser(
      running.baseHttpUrl,
      USERS.charlie.username,
      USERS.charlie.password
    );

    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/accept",
      { requestId, username: USERS.bob.username },
      charlie.accessToken
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for unknown request ID", async () => {
    const bob = await registerUser(running.baseHttpUrl, USERS.bob.username, USERS.bob.password);

    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/accept",
      { requestId: 999999, username: bob.username },
      bob.accessToken
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 for deterministic DB failure", async () => {
    const { requestId, bob } = await createPendingRequest(running.baseHttpUrl);
    mockRejectedOnce(db.friendship, "update", "friend-accept-update-failure");

    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/accept",
      { requestId, username: bob.username },
      bob.accessToken
    );

    expect(response.status).toBe(500);
  });
});
