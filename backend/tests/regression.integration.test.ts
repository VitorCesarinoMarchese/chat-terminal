import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import WebSocket, { WebSocketServer } from "ws";
import db from "../src/config/db";
import { createServer } from "../src/config/server";
import { websocketController } from "../src/controllers/websocket";

type RegisteredUser = {
  username: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  userId: number;
};

let server: HttpServer;
let wss: WebSocketServer;
let baseHttpUrl = "";
let baseWsUrl = "";

before(async () => {
  await db.$connect();
  const created = createServer();
  server = created.server;
  wss = new WebSocketServer({ server });
  websocketController(wss);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as AddressInfo;
  baseHttpUrl = `http://127.0.0.1:${address.port}`;
  baseWsUrl = `ws://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    wss.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  await db.$disconnect();
});

beforeEach(async () => {
  await db.message.deleteMany();
  await db.member.deleteMany();
  await db.chat.deleteMany();
  await db.friendship.deleteMany();
  await db.user.deleteMany();
});

const jsonHeaders = {
  "Content-Type": "application/json",
};

async function postJson(
  path: string,
  payload: Record<string, unknown>,
  token?: string
) {
  const headers = {
    ...jsonHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(`${baseHttpUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

async function getJson(path: string, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(`${baseHttpUrl}${path}`, { method: "GET", headers });
}

function decodeUserId(accessToken: string): number {
  const decoded = jwt.decode(accessToken) as jwt.JwtPayload | null;
  assert.ok(decoded, "Expected JWT payload to be decodable");
  assert.equal(
    typeof decoded.userId,
    "number",
    "Expected JWT payload to include numeric userId"
  );
  return decoded.userId;
}

async function registerUser(username: string, password = "p@ssword123") {
  const response = await postJson("/api/auth/register", { username, password });
  const raw = await response.text();
  assert.equal(response.status, 201, raw);

  const body = JSON.parse(raw) as {
    accessToken: string;
    refreshToken: string;
  };

  assert.equal(typeof body.accessToken, "string");
  assert.equal(typeof body.refreshToken, "string");

  return {
    username,
    password,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: decodeUserId(body.accessToken),
  } satisfies RegisteredUser;
}

async function waitForSocketOpen(socket: WebSocket) {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("WebSocket open timeout"));
    }, 1500);

    socket.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function waitForRawMessage(socket: WebSocket, timeoutMs = 1500) {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("WebSocket message timeout"));
    }, timeoutMs);

    const onMessage = (data: WebSocket.RawData) => {
      cleanup();
      resolve(data.toString());
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error("WebSocket closed before receiving expected message"));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("message", onMessage);
      socket.off("error", onError);
      socket.off("close", onClose);
    };

    socket.on("message", onMessage);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function waitForJsonMessage(
  socket: WebSocket,
  predicate: (payload: Record<string, unknown>) => boolean
) {
  const deadline = Date.now() + 2500;

  while (Date.now() < deadline) {
    const remainingMs = deadline - Date.now();
    const raw = await waitForRawMessage(socket, remainingMs);
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (predicate(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore non-JSON frames (e.g., initial "Connected" string)
    }
  }

  throw new Error("Timed out waiting for expected JSON WebSocket message");
}

test("auth refresh should return a concrete access token string", async () => {
  const user = await registerUser("auth-refresh-user");

  const response = await postJson("/api/auth/jwt", {
    token: "invalid.token.value",
    refreshToken: user.refreshToken,
    userId: user.userId,
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as { accessToken: unknown };
  assert.equal(typeof body.accessToken, "string");
  assert.ok((body.accessToken as string).length > 10);
});

test("friendship accept should only be allowed to the receiver", async () => {
  const alice = await registerUser("friend-alice");
  const bob = await registerUser("friend-bob");
  const charlie = await registerUser("friend-charlie");

  const inviteResponse = await postJson(
    "/api/friend/send",
    { senderUsername: alice.username, receiverUsername: bob.username },
    alice.accessToken
  );
  const inviteRaw = await inviteResponse.text();
  assert.equal(inviteResponse.status, 201, inviteRaw);

  const inviteBody = JSON.parse(inviteRaw) as {
    request: { id: number };
  };

  const unauthorizedAcceptResponse = await postJson(
    "/api/friend/accept",
    { requestId: inviteBody.request.id, username: charlie.username },
    charlie.accessToken
  );

  assert.equal(unauthorizedAcceptResponse.status, 403);

  const friendRequest = await db.friendship.findUnique({
    where: { id: inviteBody.request.id },
    select: { status: true },
  });
  assert.equal(friendRequest?.status, "PENDING");
});

test("friendship requester should be able to cancel pending request", async () => {
  const alice = await registerUser("cancel-alice");
  const bob = await registerUser("cancel-bob");

  const inviteResponse = await postJson(
    "/api/friend/send",
    { senderUsername: alice.username, receiverUsername: bob.username },
    alice.accessToken
  );
  const inviteRaw = await inviteResponse.text();
  assert.equal(inviteResponse.status, 201, inviteRaw);

  const inviteBody = JSON.parse(inviteRaw) as {
    request: { id: number };
  };

  const cancelResponse = await postJson(
    "/api/friend/cancel",
    { requestId: inviteBody.request.id, username: alice.username },
    alice.accessToken
  );

  assert.equal(cancelResponse.status, 200);

  const friendRequest = await db.friendship.findUnique({
    where: { id: inviteBody.request.id },
    select: { id: true },
  });
  assert.equal(friendRequest, null);
});

test("chat creation should require token ownership for the provided username", async () => {
  const alice = await registerUser("chat-owner");
  const bob = await registerUser("chat-owner-other");

  const response = await postJson(
    "/api/chat/create",
    {
      name: "project-room",
      username: alice.username,
      members: [],
    },
    bob.accessToken
  );

  assert.equal(response.status, 401);
});

test("chat with-user query should only return chats shared with target user", async () => {
  const alice = await registerUser("with-alice");
  const bob = await registerUser("with-bob");
  const charlie = await registerUser("with-charlie");

  const chatWithBob = await db.chat.create({
    data: { name: "alice-bob", userId: alice.userId },
    select: { id: true },
  });
  await db.member.createMany({
    data: [
      { chatId: chatWithBob.id, userId: alice.userId, role: "ADMIN" },
      { chatId: chatWithBob.id, userId: bob.userId, role: "USER" },
    ],
  });

  const chatWithCharlie = await db.chat.create({
    data: { name: "alice-charlie", userId: alice.userId },
    select: { id: true },
  });
  await db.member.createMany({
    data: [
      { chatId: chatWithCharlie.id, userId: alice.userId, role: "ADMIN" },
      { chatId: chatWithCharlie.id, userId: charlie.userId, role: "USER" },
    ],
  });

  const response = await getJson(
    `/api/chat/with?username=${alice.username}&findUser=${bob.username}`,
    alice.accessToken
  );

  const raw = await response.text();
  assert.equal(response.status, 200, raw);
  const body = JSON.parse(raw) as {
    userChats: Array<{ name: string }>;
  };
  assert.deepEqual(
    body.userChats.map((chat) => chat.name).sort(),
    ["alice-bob"]
  );
});

test("websocket members should be able to join and exchange persisted messages", async () => {
  const alice = await registerUser("ws-alice");
  const bob = await registerUser("ws-bob");

  const chat = await db.chat.create({
    data: { name: "realtime-room", userId: alice.userId },
    select: { id: true },
  });
  await db.member.createMany({
    data: [
      { chatId: chat.id, userId: alice.userId, role: "ADMIN" },
      { chatId: chat.id, userId: bob.userId, role: "USER" },
    ],
  });

  const aliceSocket = new WebSocket(baseWsUrl);
  const bobSocket = new WebSocket(baseWsUrl);

  await waitForSocketOpen(aliceSocket);
  await waitForSocketOpen(bobSocket);

  try {
    aliceSocket.send(
      JSON.stringify({
        type: "join",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          chatId: String(chat.id),
        },
      })
    );

    const aliceJoinMessage = await waitForJsonMessage(
      aliceSocket,
      (payload) =>
        payload.type === "joined" ||
        (payload.type === "error" &&
          payload.message === "Chat not found or unauthorized")
    );
    assert.equal(aliceJoinMessage.type, "joined");

    bobSocket.send(
      JSON.stringify({
        type: "join",
        payload: {
          username: bob.username,
          token: bob.accessToken,
          chatId: String(chat.id),
        },
      })
    );

    const bobJoinMessage = await waitForJsonMessage(
      bobSocket,
      (payload) =>
        payload.type === "joined" ||
        (payload.type === "error" &&
          payload.message === "Chat not found or unauthorized")
    );
    assert.equal(bobJoinMessage.type, "joined");

    aliceSocket.send(
      JSON.stringify({
        type: "chat",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          text: "hello from regression test",
        },
      })
    );

    const aliceMessage = await waitForJsonMessage(
      aliceSocket,
      (payload) => payload.type === "message" || payload.type === "error"
    );
    assert.equal(aliceMessage.type, "message");

    const bobMessage = await waitForJsonMessage(
      bobSocket,
      (payload) => payload.type === "message" || payload.type === "error"
    );
    assert.equal(bobMessage.type, "message");

    const persistedMessages = await db.message.findMany({
      where: { chatId: chat.id },
      select: { text: true },
    });
    assert.deepEqual(persistedMessages, [{ text: "hello from regression test" }]);
  } finally {
    aliceSocket.close();
    bobSocket.close();
  }
});
