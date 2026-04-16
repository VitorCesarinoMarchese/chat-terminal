import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import { getUserId, isUserIdValid, isUserValid } from "../../../src/utils/userUtils";

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

describe("userUtils", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("isUserIdValid returns true for existing user", async () => {
    const user = await createUser("utils-user-id-valid");
    await expect(isUserIdValid(user.id)).resolves.toBe(true);
  });

  it("isUserIdValid returns false for missing user", async () => {
    await expect(isUserIdValid(999999)).resolves.toBe(false);
  });

  it("isUserIdValid returns false when db throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(db.user, "findUnique").mockRejectedValueOnce(new Error("forced-user-id-failure"));

    await expect(isUserIdValid(1)).resolves.toBe(false);
  });

  it("isUserValid returns true for existing username", async () => {
    const user = await createUser("utils-user-valid");
    await expect(isUserValid(user.username)).resolves.toBe(true);
  });

  it("isUserValid returns false for missing username", async () => {
    await expect(isUserValid("missing-username")).resolves.toBe(false);
  });

  it("isUserValid returns false when db throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(db.user, "findUnique").mockRejectedValueOnce(
      new Error("forced-user-valid-failure")
    );

    await expect(isUserValid("any")).resolves.toBe(false);
  });

  it("getUserId returns user id for existing username", async () => {
    const user = await createUser("utils-get-user-id");
    await expect(getUserId(user.username)).resolves.toBe(user.id);
  });

  it("getUserId returns -1 for missing username", async () => {
    await expect(getUserId("missing-get-user-id")).resolves.toBe(-1);
  });

  it("getUserId returns -1 when db throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(db.user, "findUnique").mockRejectedValueOnce(
      new Error("forced-get-user-id-failure")
    );

    await expect(getUserId("any")).resolves.toBe(-1);
  });
});
