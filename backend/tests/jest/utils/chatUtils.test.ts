import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { chatValidation } from "../../../src/utils/chatUtils";

async function createUser(username: string) {
  return db.user.create({
    data: {
      username,
      password: "password",
      refreshToken: "",
    },
    select: { id: true, username: true },
  });
}

describe("chatUtils", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("chatValidation returns false when chat does not exist", async () => {
    const user = await createUser("chat-utils-missing-chat");
    await expect(chatValidation(999999, user.id)).resolves.toBe(false);
  });

  it("chatValidation returns false when user is not a member", async () => {
    const owner = await createUser("chat-utils-owner");
    const outsider = await createUser("chat-utils-outsider");

    const chat = await db.chat.create({
      data: { name: "chat-utils-room", userId: owner.id },
      select: { id: true },
    });

    await db.member.create({
      data: { chatId: chat.id, userId: owner.id, role: "ADMIN" },
    });

    await expect(chatValidation(chat.id, outsider.id)).resolves.toBe(false);
  });

  it("chatValidation returns true when user is a member", async () => {
    const user = await createUser("chat-utils-member");
    const chat = await db.chat.create({
      data: { name: "chat-utils-member-room", userId: user.id },
      select: { id: true },
    });

    await db.member.create({
      data: { chatId: chat.id, userId: user.id, role: "ADMIN" },
    });

    await expect(chatValidation(chat.id, user.id)).resolves.toBe(true);
  });

  it("chatValidation returns false when chat lookup throws", async () => {
    const user = await createUser("chat-utils-error-user");
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(db.chat, "findUnique").mockRejectedValueOnce(
      new Error("forced-chat-validation-failure")
    );

    await expect(chatValidation(1, user.id)).resolves.toBe(false);
  });
});
