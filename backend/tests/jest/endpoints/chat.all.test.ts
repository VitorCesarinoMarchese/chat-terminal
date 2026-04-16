import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { USERS } from "../fixtures/users";
import { CHATS } from "../fixtures/chats";
import { registerUser } from "../setup/auth";
import { db, disconnectTestDatabase } from "../setup/db";
import { mockRejectedOnce } from "../setup/faultInjection";
import { getJson, readJson } from "../setup/http";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

function uniqueUsername(prefix: string) {
  return `${prefix}-chat-all-${randomUUID().slice(0, 8)}`;
}

async function seedChatsForUserListing(baseUrl: string) {
  const alice = await registerUser(baseUrl, uniqueUsername("alice"), USERS.alice.password);
  const bob = await registerUser(baseUrl, uniqueUsername("bob"), USERS.bob.password);
  const charlie = await registerUser(baseUrl, uniqueUsername("charlie"), USERS.charlie.password);

  const aliceChat = await db.chat.create({
    data: { name: CHATS.general.name, userId: alice.userId },
    select: { id: true },
  });
  await db.member.createMany({
    data: [
      { chatId: aliceChat.id, userId: alice.userId, role: "ADMIN" },
      { chatId: aliceChat.id, userId: bob.userId, role: "USER" },
    ],
  });

  const bobChat = await db.chat.create({
    data: { name: CHATS.project.name, userId: bob.userId },
    select: { id: true },
  });
  await db.member.createMany({
    data: [
      { chatId: bobChat.id, userId: bob.userId, role: "ADMIN" },
      { chatId: bobChat.id, userId: charlie.userId, role: "USER" },
    ],
  });

  return { alice, bob };
}

describe("GET /api/chat/all", () => {
  let running: RunningTestServer;

  beforeAll(async () => {
    running = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer(running);
    await disconnectTestDatabase();
  });

  it("returns 200 and only chats where the requester is a member", async () => {
    const { alice, bob } = await seedChatsForUserListing(running.baseHttpUrl);
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/all?username=${alice.username}`,
      alice.accessToken
    );
    const body = await readJson<
      { userChats: Array<{ name: string; member: Array<{ user: { username: string } }> }> }
    >(response);

    expect(response.status).toBe(200);
    expect(body.userChats.map((chat) => chat.name)).toEqual([CHATS.general.name]);
    expect(body.userChats[0]?.member.map((member) => member.user.username).sort()).toEqual(
      [alice.username, bob.username].sort()
    );
  });

  it("returns 200 with an empty list when the requester has no chats", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("alice"),
      USERS.alice.password
    );
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/all?username=${alice.username}`,
      alice.accessToken
    );
    const body = await readJson<{ userChats: unknown[] }>(response);

    expect(response.status).toBe(200);
    expect(body.userChats).toEqual([]);
  });

  it("returns 400 when username query is missing", async () => {
    const { alice } = await seedChatsForUserListing(running.baseHttpUrl);
    const response = await getJson(running.baseHttpUrl, "/api/chat/all", alice.accessToken);
    expect(response.status).toBe(400);
  });

  it("returns 401 when auth token is missing", async () => {
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/all?username=${USERS.alice.username}`
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 for token/username mismatch", async () => {
    const { alice, bob } = await seedChatsForUserListing(running.baseHttpUrl);
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/all?username=${alice.username}`,
      bob.accessToken
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when username does not exist", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("alice"),
      USERS.alice.password
    );
    const response = await getJson(
      running.baseHttpUrl,
      "/api/chat/all?username=unknown-user",
      alice.accessToken
    );

    expect(response.status).toBe(404);
  });

  it("returns 500 for deterministic DB failure", async () => {
    const { alice } = await seedChatsForUserListing(running.baseHttpUrl);
    mockRejectedOnce(db.chat, "findMany", "chat-all-findMany-failure");

    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/all?username=${alice.username}`,
      alice.accessToken
    );
    const body = await readJson<{ error?: string }>(response);

    expect(response.status).toBe(500);
    expect(typeof body.error).toBe("string");
  });
});
