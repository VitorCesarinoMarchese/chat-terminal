import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import jwt from "jsonwebtoken";
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

async function seedChatForUser() {
  const alice = await createSocketUser(USERS.alice.username);
  const chat = await db.chat.create({
    data: { name: CHATS.general.name, userId: alice.userId },
    select: { id: true },
  });
  await db.member.create({
    data: { chatId: chat.id, userId: alice.userId, role: "ADMIN" },
  });
  return { alice, chatId: chat.id };
}

async function seedRejoinScenario() {
  const alice = await createSocketUser(USERS.alice.username);
  const bob = await createSocketUser(USERS.bob.username);

  const firstChat = await db.chat.create({
    data: { name: `${CHATS.general.name}-old`, userId: alice.userId },
    select: { id: true },
  });
  const secondChat = await db.chat.create({
    data: { name: `${CHATS.project.name}-new`, userId: alice.userId },
    select: { id: true },
  });

  await db.member.createMany({
    data: [
      { chatId: firstChat.id, userId: alice.userId, role: "ADMIN" },
      { chatId: firstChat.id, userId: bob.userId, role: "USER" },
      { chatId: secondChat.id, userId: alice.userId, role: "ADMIN" },
    ],
  });

  return { alice, bob, firstChatId: firstChat.id, secondChatId: secondChat.id };
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

describe("WebSocket join flow", () => {
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

  it("joins successfully for a valid member", async () => {
    const { alice, chatId } = await seedChatForUser();
    const socket = await openSocket(running.baseWsUrl);

    try {
      sendJson(socket, {
        type: "join",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          chatId: String(chatId),
        },
      });

      const message = await waitForJsonMessage(socket, (value) => value.type === "joined");
      expect(message).toEqual(expect.objectContaining({ type: "joined", chatId }));
    } finally {
      await closeSocket(socket);
    }
  });

  it("returns invalid JSON error for malformed frames", async () => {
    const socket = await openSocket(running.baseWsUrl);
    try {
      socket.send("{not-json");
      const message = await waitForJsonMessage(
        socket,
        (value) => value.error === "Invalid JSON format"
      );
      expect(message.error).toBe("Invalid JSON format");
    } finally {
      await closeSocket(socket);
    }
  });

  it("returns message structure error for malformed envelopes", async () => {
    const socket = await openSocket(running.baseWsUrl);

    try {
      sendJson(socket, { payload: { chatId: "1" } });

      const message = await waitForJsonMessage(
        socket,
        (value) => value.error === "Invalid message structure"
      );
      expect(message.error).toBe("Invalid message structure");
    } finally {
      await closeSocket(socket);
    }
  });

  it("returns payload structure error for malformed join payload", async () => {
    const socket = await openSocket(running.baseWsUrl);
    try {
      sendJson(socket, { type: "join", payload: { username: USERS.alice.username } });
      const message = await waitForJsonMessage(
        socket,
        (value) => value.type === "error" && value.message === "Invalid payload structure"
      );
      expect(message.type).toBe("error");
    } finally {
      await closeSocket(socket);
    }
  });

  it("returns payload structure error for non-numeric chat id", async () => {
    const alice = await createSocketUser(USERS.alice.username);
    const socket = await openSocket(running.baseWsUrl);

    try {
      sendJson(socket, {
        type: "join",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          chatId: "not-a-number",
        },
      });

      const message = await waitForJsonMessage(
        socket,
        (value) => value.type === "error" && value.message === "Invalid payload structure"
      );
      expect(message.message).toBe("Invalid payload structure");
    } finally {
      await closeSocket(socket);
    }
  });

  it("returns invalid token error when token is invalid", async () => {
    const { alice, chatId } = await seedChatForUser();
    const socket = await openSocket(running.baseWsUrl);

    try {
      sendJson(socket, {
        type: "join",
        payload: {
          username: alice.username,
          token: "invalid-token",
          chatId: String(chatId),
        },
      });

      const message = await waitForJsonMessage(
        socket,
        (value) => value.type === "error" && value.message === "Invalid token"
      );
      expect(message.message).toBe("Invalid token");
    } finally {
      await closeSocket(socket);
    }
  });

  it("returns unauthorized chat error for non-members", async () => {
    const { chatId } = await seedChatForUser();
    const bob = await createSocketUser(USERS.bob.username);
    const socket = await openSocket(running.baseWsUrl);

    try {
      sendJson(socket, {
        type: "join",
        payload: {
          username: bob.username,
          token: bob.accessToken,
          chatId: String(chatId),
        },
      });

      const message = await waitForJsonMessage(
        socket,
        (value) =>
          value.type === "error" && value.message === "Chat not found or unauthorized"
      );
      expect(message.message).toBe("Chat not found or unauthorized");
    } finally {
      await closeSocket(socket);
    }
  });

  it("handles deterministic chat lookup failure during join", async () => {
    const { alice, chatId } = await seedChatForUser();
    const socket = await openSocket(running.baseWsUrl);

    jest.spyOn(db.chat, "findUnique").mockRejectedValueOnce(new Error("join-chat-failure"));

    try {
      sendJson(socket, {
        type: "join",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          chatId: String(chatId),
        },
      });

      const message = await waitForJsonMessage(
        socket,
        (value) =>
          value.type === "error" && value.message === "Chat not found or unauthorized"
      );
      expect(message.message).toBe("Chat not found or unauthorized");
    } finally {
      await closeSocket(socket);
    }
  });

  it("returns unknown type error for unsupported message type", async () => {
    const socket = await openSocket(running.baseWsUrl);

    try {
      sendJson(socket, { type: "unsupported_type", payload: {} });
      const message = await waitForJsonMessage(
        socket,
        (value) =>
          value.type === "error" &&
          value.message === "Unknown message type: unsupported_type"
      );

      expect(message.message).toBe("Unknown message type: unsupported_type");
    } finally {
      await closeSocket(socket);
    }
  });

  it("emits user_left when a socket switches from one chat to another", async () => {
    const { alice, bob, firstChatId, secondChatId } = await seedRejoinScenario();
    const aliceSocket = await openSocket(running.baseWsUrl);
    const bobSocket = await openSocket(running.baseWsUrl);

    try {
      await joinChat(bobSocket, bob, firstChatId);
      await joinChat(aliceSocket, alice, firstChatId);

      sendJson(aliceSocket, {
        type: "join",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          chatId: String(secondChatId),
        },
      });

      const switched = await waitForJsonMessage(
        aliceSocket,
        (value) => value.type === "joined" && value.chatId === secondChatId
      );
      expect(switched.chatId).toBe(secondChatId);

      const userLeft = await waitForJsonMessage(
        bobSocket,
        (value) =>
          value.type === "user_left" &&
          (value.data as { username?: string; chatId?: number }).username === alice.username &&
          (value.data as { username?: string; chatId?: number }).chatId === firstChatId
      );

      expect(userLeft.type).toBe("user_left");
    } finally {
      await closeSocket(aliceSocket);
      await closeSocket(bobSocket);
    }
  });
});
