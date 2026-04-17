import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { USERS } from "../fixtures/users";
import { registerUser } from "../setup/auth";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { mockRejectedOnce } from "../setup/faultInjection";
import { getJson, postJson, readJson } from "../setup/http";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

async function seedFriendship(baseUrl: string) {
  const alice = await registerUser(baseUrl, USERS.alice.username, USERS.alice.password);
  const bob = await registerUser(baseUrl, USERS.bob.username, USERS.bob.password);

  const invite = await postJson(
    baseUrl,
    "/api/friend/send",
    { senderUsername: USERS.alice.username, receiverUsername: USERS.bob.username },
    alice.accessToken
  );
  const inviteBody = await readJson<{ request?: { id?: number } }>(invite);
  if (invite.status !== 201 || typeof inviteBody.request?.id !== "number") {
    throw new Error(`seedFriendship invite failed (${invite.status}): ${JSON.stringify(inviteBody)}`);
  }

  const acceptResponse = await postJson(
    baseUrl,
    "/api/friend/accept",
    { requestId: inviteBody.request.id, username: bob.username },
    bob.accessToken
  );
  if (acceptResponse.status !== 200) {
    const acceptBody = await readJson<Record<string, unknown>>(acceptResponse);
    throw new Error(
      `seedFriendship accept failed (${acceptResponse.status}): ${JSON.stringify(acceptBody)}`
    );
  }

  return { alice, bob };
}

describe("GET /api/friend/list", () => {
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

  it("returns 200 and friend relations for the authenticated user", async () => {
    const { alice } = await seedFriendship(running.baseHttpUrl);
    const response = await getJson(
      running.baseHttpUrl,
      `/api/friend/list?username=${alice.username}`,
      alice.accessToken
    );
    const body = await readJson<{ friendRequests: unknown[] }>(response);

    expect(response.status).toBe(200);
    expect(Array.isArray(body.friendRequests)).toBe(true);
    expect(body.friendRequests.length).toBe(1);
  });

  it("returns 400 for missing username query", async () => {
    const { alice } = await seedFriendship(running.baseHttpUrl);
    const response = await getJson(running.baseHttpUrl, "/api/friend/list", alice.accessToken);
    expect(response.status).toBe(400);
  });

  it("returns 401 when auth token is missing", async () => {
    const response = await getJson(
      running.baseHttpUrl,
      `/api/friend/list?username=${USERS.alice.username}`
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 for token/username authorization mismatch", async () => {
    const { alice } = await seedFriendship(running.baseHttpUrl);
    const charlie = await registerUser(
      running.baseHttpUrl,
      USERS.charlie.username,
      USERS.charlie.password
    );

    const response = await getJson(
      running.baseHttpUrl,
      `/api/friend/list?username=${alice.username}`,
      charlie.accessToken
    );
    expect(response.status).toBe(401);
  });

  it("returns 500 for deterministic DB failure", async () => {
    const { alice } = await seedFriendship(running.baseHttpUrl);
    mockRejectedOnce(db.friendship, "findMany", "friend-list-findMany-failure");

    const response = await getJson(
      running.baseHttpUrl,
      `/api/friend/list?username=${alice.username}`,
      alice.accessToken
    );
    expect(response.status).toBe(500);
  });
});
