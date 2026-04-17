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
  return `${prefix}-chat-with-${randomUUID().slice(0, 8)}`;
}

async function seedSharedChats(baseUrl: string) {
  const alice = await registerUser(baseUrl, uniqueUsername("alice"), USERS.alice.password);
  const bob = await registerUser(baseUrl, uniqueUsername("bob"), USERS.bob.password);
  const charlie = await registerUser(baseUrl, uniqueUsername("charlie"), USERS.charlie.password);

  const chatWithBob = await db.chat.create({
    data: { name: CHATS.general.name, userId: alice.userId },
    select: { id: true },
  });
  await db.member.createMany({
    data: [
      { chatId: chatWithBob.id, userId: alice.userId, role: "ADMIN" },
      { chatId: chatWithBob.id, userId: bob.userId, role: "USER" },
    ],
  });

  const chatWithCharlie = await db.chat.create({
    data: { name: CHATS.project.name, userId: bob.userId },
    select: { id: true },
  });
  await db.member.createMany({
    data: [
      { chatId: chatWithCharlie.id, userId: bob.userId, role: "ADMIN" },
      { chatId: chatWithCharlie.id, userId: charlie.userId, role: "USER" },
    ],
  });

  return { alice, bob };
}

describe("GET /api/chat/with", () => {
  let running: RunningTestServer;

  beforeAll(async () => {
    running = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer(running);
    await disconnectTestDatabase();
  });

  it("returns 200 and chats where requester is a member", async () => {
    const { alice, bob } = await seedSharedChats(running.baseHttpUrl);

    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/with?username=${alice.username}&findUser=${bob.username}`,
      alice.accessToken
    );
    const body = await readJson<{ userChats: Array<{ id: number; name: string }> }>(response);

    expect(response.status).toBe(200);
    expect(typeof body.userChats[0]?.id).toBe("number");
    expect(body.userChats.map((chat) => chat.name).sort()).toEqual([CHATS.general.name]);
  });

  it("returns 400 for missing query fields", async () => {
    const { alice } = await seedSharedChats(running.baseHttpUrl);
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/with?username=${alice.username}`,
      alice.accessToken
    );

    expect(response.status).toBe(400);
  });

  it("returns 401 when auth token is missing", async () => {
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/with?username=${USERS.alice.username}&findUser=${USERS.bob.username}`
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 for token/username ownership mismatch", async () => {
    const { alice, bob } = await seedSharedChats(running.baseHttpUrl);
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/with?username=${alice.username}&findUser=${bob.username}`,
      bob.accessToken
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when username does not exist", async () => {
    const { alice } = await seedSharedChats(running.baseHttpUrl);
    const response = await getJson(
      running.baseHttpUrl,
      "/api/chat/with?username=missing-user&findUser=bob",
      alice.accessToken
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 when findUser does not exist", async () => {
    const { alice } = await seedSharedChats(running.baseHttpUrl);
    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/with?username=${alice.username}&findUser=missing-target-user`,
      alice.accessToken
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 for deterministic DB failure", async () => {
    const { alice, bob } = await seedSharedChats(running.baseHttpUrl);
    mockRejectedOnce(db.chat, "findMany", "chat-with-findMany-failure");

    const response = await getJson(
      running.baseHttpUrl,
      `/api/chat/with?username=${alice.username}&findUser=${bob.username}`,
      alice.accessToken
    );
    const body = await readJson<{ error?: string }>(response);

    expect(response.status).toBe(500);
    expect(typeof body.error).toBe("string");
  });
});
