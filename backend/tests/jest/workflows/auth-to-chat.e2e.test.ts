import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import type WebSocket from "ws";
import { USERS } from "../fixtures/users";
import { CHATS } from "../fixtures/chats";
import { registerUser, loginUser, type UserSession } from "../setup/auth";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { postJson, readJson, getJson } from "../setup/http";
import { RunningTestServer, startTestServer, stopTestServer } from "../setup/server";
import { closeSocket, openSocket, sendJson, waitForJsonMessage } from "../setup/websocket";

type FriendRequestResponse = {
  request?: {
    id?: number;
  };
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function registerAndLoginUser(baseUrl: string, username: string, password: string) {
  const registration = await registerUser(baseUrl, username, password);
  return loginUser(baseUrl, registration.username, registration.password);
}

async function sendFriendInvite(
  baseUrl: string,
  sender: UserSession,
  receiverUsername: string
) {
  const inviteResponse = await postJson(
    baseUrl,
    "/api/friend/send",
    { senderUsername: sender.username, receiverUsername },
    sender.accessToken
  );
  const inviteBody = await readJson<FriendRequestResponse>(inviteResponse);

  if (inviteResponse.status !== 201 || typeof inviteBody.request?.id !== "number") {
    throw new Error(`Friend invite failed (${inviteResponse.status}): ${JSON.stringify(inviteBody)}`);
  }

  return inviteBody.request.id;
}

async function waitForChatMembers(chatName: string, expectedUsernames: string[]) {
  const expected = [...expectedUsernames].sort();
  const deadline = Date.now() + 2000;

  while (Date.now() < deadline) {
    const chat = await db.chat.findFirst({
      where: { name: chatName },
      select: {
        id: true,
        member: {
          select: { user: { select: { username: true } } },
        },
      },
    });

    if (chat) {
      const usernames = chat.member.map((member) => member.user.username).sort();
      if (JSON.stringify(usernames) === JSON.stringify(expected)) {
        return chat.id;
      }
    }

    await sleep(20);
  }

  throw new Error(`Timed out waiting for chat members: ${expected.join(", ")}`);
}

async function joinChat(socket: WebSocket, user: UserSession, chatId: number) {
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

async function waitForPersistedMessage(chatId: number, text: string) {
  const deadline = Date.now() + 2000;

  while (Date.now() < deadline) {
    const message = await db.message.findFirst({
      where: { chatId, text },
      orderBy: { id: "desc" },
      select: {
        chatId: true,
        text: true,
        sentBy: { select: { username: true } },
      },
    });

    if (message) {
      return message;
    }

    await sleep(20);
  }

  throw new Error(`Timed out waiting for persisted message '${text}' in chat ${chatId}`);
}

describe("API workflow: auth -> friendship -> chat -> websocket messaging", () => {
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

  it("completes a realistic happy-path workflow end to end", async () => {
    const alice = await registerAndLoginUser(
      running.baseHttpUrl,
      USERS.alice.username,
      USERS.alice.password
    );
    const bob = await registerAndLoginUser(
      running.baseHttpUrl,
      USERS.bob.username,
      USERS.bob.password
    );

    const requestId = await sendFriendInvite(running.baseHttpUrl, alice, bob.username);

    const acceptResponse = await postJson(
      running.baseHttpUrl,
      "/api/friend/accept",
      { requestId, username: bob.username },
      bob.accessToken
    );
    expect(acceptResponse.status).toBe(200);

    const acceptedRequest = await db.friendship.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    expect(acceptedRequest?.status).toBe("ACCEPTED");

    const createChatResponse = await postJson(
      running.baseHttpUrl,
      "/api/chat/create",
      { name: CHATS.general.name, username: alice.username, members: [bob.username] },
      alice.accessToken
    );
    expect(createChatResponse.status).toBe(201);

    const chatId = await waitForChatMembers(CHATS.general.name, [alice.username, bob.username]);

    const chatsResponse = await getJson(
      running.baseHttpUrl,
      `/api/chat/all?username=${bob.username}`,
      bob.accessToken
    );
    const chatsBody = await readJson<{ userChats?: Array<{ name: string }> }>(chatsResponse);
    expect(chatsResponse.status).toBe(200);
    expect(chatsBody.userChats?.map((chat) => chat.name)).toContain(CHATS.general.name);

    const aliceSocket = await openSocket(running.baseWsUrl);
    const bobSocket = await openSocket(running.baseWsUrl);

    try {
      await joinChat(aliceSocket, alice, chatId);
      await joinChat(bobSocket, bob, chatId);

      const messageText = "workflow-message";
      sendJson(aliceSocket, {
        type: "chat",
        payload: {
          username: alice.username,
          token: alice.accessToken,
          text: messageText,
        },
      });

      const isExpectedMessage = (value: Record<string, unknown>) => {
        if (value.type !== "message" || typeof value.data !== "object" || value.data === null) {
          return false;
        }

        return (value.data as Record<string, unknown>).text === messageText;
      };

      const [messageForAlice, messageForBob] = await Promise.all([
        waitForJsonMessage(aliceSocket, isExpectedMessage),
        waitForJsonMessage(bobSocket, isExpectedMessage),
      ]);

      const aliceWsData = messageForAlice.data as Record<string, unknown>;
      const bobWsData = messageForBob.data as Record<string, unknown>;
      expect(aliceWsData.text).toBe(messageText);
      expect(bobWsData.text).toBe(messageText);
      expect(aliceWsData.username).toBe(alice.username);
      expect(bobWsData.username).toBe(alice.username);

      const persistedMessage = await waitForPersistedMessage(chatId, messageText);
      expect(persistedMessage.text).toBe(messageText);
      expect(persistedMessage.chatId).toBe(chatId);
      expect(persistedMessage.sentBy.username).toBe(alice.username);
    } finally {
      await closeSocket(aliceSocket);
      await closeSocket(bobSocket);
    }
  });

  it("blocks workflow progression when auth identity does not match the bearer token", async () => {
    const alice = await registerAndLoginUser(
      running.baseHttpUrl,
      USERS.alice.username,
      USERS.alice.password
    );
    const bob = await registerAndLoginUser(
      running.baseHttpUrl,
      USERS.bob.username,
      USERS.bob.password
    );

    const requestId = await sendFriendInvite(running.baseHttpUrl, alice, bob.username);

    const unauthorizedAccept = await postJson(
      running.baseHttpUrl,
      "/api/friend/accept",
      { requestId, username: alice.username },
      bob.accessToken
    );
    expect(unauthorizedAccept.status).toBe(401);

    const pendingRequest = await db.friendship.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    expect(pendingRequest?.status).toBe("PENDING");
  });
});
