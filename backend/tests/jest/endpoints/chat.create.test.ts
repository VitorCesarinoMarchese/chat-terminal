import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { USERS } from "../fixtures/users";
import { CHATS } from "../fixtures/chats";
import { registerUser } from "../setup/auth";
import { db, disconnectTestDatabase } from "../setup/db";
import { mockRejectedOnce } from "../setup/faultInjection";
import { postJson, readJson } from "../setup/http";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";

function uniqueUsername(prefix: string) {
  return `${prefix}-chat-create-${randomUUID().slice(0, 8)}`;
}

async function waitForChatMembers(chatId: number, expectedUsernames: string[]) {
  const expected = [...expectedUsernames].sort();
  const deadline = Date.now() + 2000;

  while (Date.now() < deadline) {
    const members = await db.member.findMany({
      where: { chatId },
      select: { user: { select: { username: true } } },
    });
    const usernames = members.map((member) => member.user.username).sort();

    if (JSON.stringify(usernames) === JSON.stringify(expected)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error(`Timed out waiting for chat members: ${expected.join(", ")}`);
}

describe("POST /api/chat/create", () => {
  let running: RunningTestServer;

  beforeAll(async () => {
    running = await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer(running);
    await disconnectTestDatabase();
  });

  it("returns 201 and stores the created chat for valid input", async () => {
    const aliceUsername = uniqueUsername("alice");
    const bobUsername = uniqueUsername("bob");
    const alice = await registerUser(
      running.baseHttpUrl,
      aliceUsername,
      USERS.alice.password
    );
    await registerUser(running.baseHttpUrl, bobUsername, USERS.bob.password);

    const response = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      {
        name: CHATS.general.name,
        username: alice.username,
        members: [bobUsername],
      },
      alice.accessToken
    );
    const body = await readJson<{ message?: string }>(response);

    expect(response.status).toBe(201);
    expect(body.message).toBe(`Chat ${CHATS.general.name} created`);

    const createdChat = await db.chat.findFirst({
      where: { name: CHATS.general.name, userId: alice.userId },
      select: { id: true, userId: true },
    });
    expect(createdChat).not.toBeNull();
    await waitForChatMembers(createdChat!.id, [alice.username, bobUsername]);
  });

  it("returns 201 when members is empty and creates only admin membership", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("alice"),
      USERS.alice.password
    );

    const response = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      {
        name: CHATS.general.name,
        username: alice.username,
        members: [],
      },
      alice.accessToken
    );
    const body = await readJson<{ message?: string }>(response);

    expect(response.status).toBe(201);
    expect(body.message).toBe(`Chat ${CHATS.general.name} created`);

    const createdChat = await db.chat.findFirst({
      where: { name: CHATS.general.name, userId: alice.userId },
      select: { id: true },
    });
    expect(createdChat).not.toBeNull();

    const memberships = await db.member.findMany({
      where: { chatId: createdChat!.id },
      select: { userId: true, role: true },
    });
    expect(memberships).toEqual([{ userId: alice.userId, role: "ADMIN" }]);
  });

  it("returns 400 when required payload fields are missing", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("alice"),
      USERS.alice.password
    );

    const response = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      {
        name: CHATS.general.name,
        username: alice.username,
      },
      alice.accessToken
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when members is not an array", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("alice"),
      USERS.alice.password
    );

    const response = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      {
        name: CHATS.project.name,
        username: alice.username,
        members: USERS.bob.username,
      },
      alice.accessToken
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 and does not create chat when any member username is invalid", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("alice"),
      USERS.alice.password
    );
    const chatName = `invalid-member-${randomUUID().slice(0, 8)}`;

    const response = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      {
        name: chatName,
        username: alice.username,
        members: ["user-does-not-exist"],
      },
      alice.accessToken
    );

    expect(response.status).toBe(400);

    const createdChat = await db.chat.findFirst({
      where: { name: chatName, userId: alice.userId },
      select: { id: true },
    });
    expect(createdChat).toBeNull();
  });

  it("returns 401 when auth token is missing", async () => {
    const response = await postJson(running.baseHttpUrl, "/api/chat/create", {
      name: CHATS.general.name,
      username: USERS.alice.username,
      members: [],
    });

    expect(response.status).toBe(401);
  });

  it("returns 401 for token/username ownership mismatch", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("alice"),
      USERS.alice.password
    );
    const bob = await registerUser(running.baseHttpUrl, uniqueUsername("bob"), USERS.bob.password);

    const response = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      {
        name: CHATS.project.name,
        username: alice.username,
        members: [],
      },
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

    const response = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      {
        name: CHATS.project.name,
        username: "unknown-user",
        members: [],
      },
      alice.accessToken
    );

    expect(response.status).toBe(404);
  });

  it("returns 500 for deterministic DB failure", async () => {
    const alice = await registerUser(
      running.baseHttpUrl,
      uniqueUsername("alice"),
      USERS.alice.password
    );
    mockRejectedOnce(db, "$transaction", "chat-create-failure");

    const response = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      {
        name: CHATS.general.name,
        username: alice.username,
        members: [],
      },
      alice.accessToken
    );
    const body = await readJson<{ error?: string }>(response);

    expect(response.status).toBe(500);
    expect(typeof body.error).toBe("string");
  });
});
