import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { USERS } from "../fixtures/users";
import { registerUser } from "../setup/auth";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { mockRejectedOnce } from "../setup/faultInjection";
import { postJson } from "../setup/http";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

describe("POST /api/friend/send", () => {
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

  it("returns 201 when sending a valid friend request", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      USERS.alice.username,
      USERS.alice.password
    );
    await registerUser(running.baseHttpUrl, USERS.bob.username, USERS.bob.password);

    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/send",
      { senderUsername: USERS.alice.username, receiverUsername: USERS.bob.username },
      alice.accessToken
    );

    expect(response.status).toBe(201);
  });

  it("returns 400 for missing request payload fields", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      USERS.alice.username,
      USERS.alice.password
    );

    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/send",
      { senderUsername: USERS.alice.username },
      alice.accessToken
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when auth token is missing", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/friend/send", {
      senderUsername: USERS.alice.username,
      receiverUsername: USERS.bob.username,
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 when receiver does not exist", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      USERS.alice.username,
      USERS.alice.password
    );

    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/send",
      { senderUsername: USERS.alice.username, receiverUsername: "unknown-user" },
      alice.accessToken
    );

    expect(response.status).toBe(400);
  });

  it("returns 409 when friendship request already exists", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      USERS.alice.username,
      USERS.alice.password
    );
    await registerUser(running.baseHttpUrl, USERS.bob.username, USERS.bob.password);

    await postJson(
      running.baseHttpUrl,
      "/api/friend/send",
      { senderUsername: USERS.alice.username, receiverUsername: USERS.bob.username },
      alice.accessToken
    );

    const duplicate = await postJson(
      running.baseHttpUrl,
      "/api/friend/send",
      { senderUsername: USERS.alice.username, receiverUsername: USERS.bob.username },
      alice.accessToken
    );

    expect(duplicate.status).toBe(409);
  });

  it("returns 500 for deterministic DB failure", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      USERS.alice.username,
      USERS.alice.password
    );

    mockRejectedOnce(db.user, "findUnique", "friend-send-findUnique-failure");

    const response = await postJson(
      running.baseHttpUrl,
      "/api/friend/send",
      { senderUsername: USERS.alice.username, receiverUsername: USERS.bob.username },
      alice.accessToken
    );
    expect(response.status).toBe(500);
  });
});
