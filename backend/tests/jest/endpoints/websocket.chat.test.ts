import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import type WebSocket from "ws";
import { USERS } from "../fixtures/users";
import { CHATS } from "../fixtures/chats";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";
import { closeSocket, openSocket, sendJson, waitForJsonMessage } from "../setup/websocket";

type SocketUserSession = {
  username: string;
  accessToken: string;
  userId: number;
};

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("Missing JWT_SECRET for websocket tests");
}

async function createSocketUser(username: string): Promise<SocketUserSession> {
  const user = await db.user.create({
    data: {
      username,
      password: USERS.alice.password,
      refreshToken: `refresh-token-${username}`,
    },
    select: { id: true, username: true },
  });

  const accessToken = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "15m" });
  return { username: user.username, accessToken, userId: user.id };
}

async function seedChatMembers() {
  const alice = await createSocketUser(USERS.alice.username);
  const bob = await createSocketUser(USERS.bob.username);

  const chat = await db.chat.create({
    data: { name: CHATS.general.name, userId: alice.userId },
    select: { id: true },
  });
  await db.member.createMany({
    data: [
      { chatId: chat.id, userId: alice.userId, role: "ADMIN" },
      { chatId: chat.id, userId: bob.userId, role: "USER" },
    ],
  });

  return { alice, bob, chatId: chat.id };
}

async function joinChat(socket: WebSocket, user: SocketUserSession, chatId: number) {
  sendJson(socket, {
    type: "join",
    payload: {
      username: user.username,
      token: user.accessToken,
      chatId: String(chatId),
    },
  });
  await waitForJsonMessage(
    socket,
    (value) => value.type === "joined" && value.chatId === chatId
  );
}

describe("WebSocket chat flow", () => {
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

  it("returns error when sending chat before join", async () => {
    const alice = await createSocketUser(USERS.alice.username);
    const socket = await openSocket(running.baseWsUrl);

    try {
      sendJson(socket, {
        type: "chat",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          text: "message-before-join",
        },
      });

      const message = await waitForJsonMessage(
        socket,
        (value) =>
          value.type === "error" &&
          value.message === "You are not in a chat, join one before sending messages"
      );
      expect(message.type).toBe("error");
    } finally {
      await closeSocket(socket);
    }
  });

  it("broadcasts and persists chat messages after successful join", async () => {
    const { alice, bob, chatId } = await seedChatMembers();
    const aliceSocket = await openSocket(running.baseWsUrl);
    const bobSocket = await openSocket(running.baseWsUrl);

    try {
      await joinChat(aliceSocket, alice, chatId);
      await joinChat(bobSocket, bob, chatId);

      sendJson(aliceSocket, {
        type: "chat",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          text: "hello-websocket",
        },
      });

      const aliceMessage = await waitForJsonMessage(
        aliceSocket,
        (value) => value.type === "message"
      );
      const bobMessage = await waitForJsonMessage(bobSocket, (value) => value.type === "message");

      expect(aliceMessage.type).toBe("message");
      expect((aliceMessage.data as { text: string }).text).toBe("hello-websocket");
      expect((bobMessage.data as { text: string }).text).toBe("hello-websocket");

      const persisted = await db.message.findMany({
        where: { chatId },
        select: { text: true },
      });
      expect(persisted).toEqual([{ text: "hello-websocket" }]);
    } finally {
      await closeSocket(aliceSocket);
      await closeSocket(bobSocket);
    }
  });

  it("returns payload structure error for malformed chat payload", async () => {
    const { alice, chatId } = await seedChatMembers();
    const socket = await openSocket(running.baseWsUrl);

    try {
      await joinChat(socket, alice, chatId);

      sendJson(socket, {
        type: "chat",
        payload: {
          username: alice.username,
          token: alice.accessToken,
        },
      });

      const errorMessage = await waitForJsonMessage(
        socket,
        (value) => value.type === "error" && value.message === "Invalid payload structure"
      );
      expect(errorMessage.message).toBe("Invalid payload structure");
    } finally {
      await closeSocket(socket);
    }
  });

  it("enforces rate limit for rapid consecutive messages", async () => {
    const { alice, chatId } = await seedChatMembers();
    const socket = await openSocket(running.baseWsUrl);

    try {
      await joinChat(socket, alice, chatId);

      sendJson(socket, {
        type: "chat",
        payload: { username: alice.username, token: alice.accessToken, text: "first" },
      });
      sendJson(socket, {
        type: "chat",
        payload: { username: alice.username, token: alice.accessToken, text: "second" },
      });
      const second = await waitForJsonMessage(
        socket,
        (value) => value.type === "error" && value.message === "Too many messages"
      );
      expect(second.message).toBe("Too many messages");

      const persisted = await db.message.findMany({
        where: { chatId },
        select: { text: true },
      });
      expect(persisted).toEqual([{ text: "first" }]);
    } finally {
      await closeSocket(socket);
    }
  });

  it("returns failure message for deterministic DB write failure", async () => {
    const { alice, chatId } = await seedChatMembers();
    const socket = await openSocket(running.baseWsUrl);

    jest.spyOn(db.message, "create").mockRejectedValueOnce(new Error("ws-message-write-failure"));

    try {
      await joinChat(socket, alice, chatId);

      sendJson(socket, {
        type: "chat",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          text: "should-fail",
        },
      });

      const errorMessage = await waitForJsonMessage(
        socket,
        (value) => value.type === "error" && value.message === "Failed to send message"
      );
      expect(errorMessage.message).toBe("Failed to send message");

      const persisted = await db.message.findMany({
        where: { chatId },
        select: { text: true },
      });
      expect(persisted).toEqual([]);
    } finally {
      await closeSocket(socket);
    }
  });
});
