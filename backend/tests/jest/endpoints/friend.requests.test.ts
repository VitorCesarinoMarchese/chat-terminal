import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { USERS } from "../fixtures/users";
import { registerUser } from "../setup/auth";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { mockRejectedOnce } from "../setup/faultInjection";
import { getJson, postJson, readJson } from "../setup/http";
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
  return { alice, bob };
}

describe("GET /api/friend/requests", () => {
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

  it("returns 200 with pending requests for the authenticated user", async () => {
    const { bob } = await createPendingRequest(running.baseHttpUrl);

    const response = await getJson(
      running.baseHttpUrl,
      `/api/friend/requests?username=${bob.username}`,
      bob.accessToken
    );
    const body = await readJson<{ friendRequests: unknown[] }>(response);

    expect(response.status).toBe(200);
    expect(Array.isArray(body.friendRequests)).toBe(true);
    expect(body.friendRequests.length).toBe(1);
  });

  it("returns 400 for missing username query", async () => {
    const { bob } = await createPendingRequest(running.baseHttpUrl);
    const response = await getJson(running.baseHttpUrl, "/api/friend/requests", bob.accessToken);
    expect(response.status).toBe(400);
  });

  it("returns 401 when auth token is missing", async () => {
    const response = await getJson(
      running.baseHttpUrl,
      `/api/friend/requests?username=${USERS.bob.username}`
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 for token/username authorization mismatch", async () => {
    const { alice } = await createPendingRequest(running.baseHttpUrl);
    const bob = await registerUser(running.baseHttpUrl, USERS.charlie.username, USERS.charlie.password);

    const response = await getJson(
      running.baseHttpUrl,
      `/api/friend/requests?username=${alice.username}`,
      bob.accessToken
    );
    expect(response.status).toBe(401);
  });

  it("returns 500 for deterministic DB failure", async () => {
    const { bob } = await createPendingRequest(running.baseHttpUrl);
    mockRejectedOnce(db.friendship, "findMany", "friend-requests-findMany-failure");

    const response = await getJson(
      running.baseHttpUrl,
      `/api/friend/requests?username=${bob.username}`,
      bob.accessToken
    );
    expect(response.status).toBe(500);
  });
});
