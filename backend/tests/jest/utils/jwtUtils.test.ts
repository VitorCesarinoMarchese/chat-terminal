import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import { db, disconnectTestDatabase, resetTestDatabase } from "../setup/db";
import {
  generateAccessToken,
  generateTokens,
  validateAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../../src/utils/jwtUtils";

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

describe("jwtUtils", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("generateTokens returns access and refresh tokens", async () => {
    const user = await createUser("jwt-utils-generate-tokens");
    const tokens = await generateTokens(user.id);

    expect(typeof tokens.accessToken).toBe("string");
    expect(typeof tokens.refreshToken).toBe("string");
    expect(tokens.accessToken.length).toBeGreaterThan(10);
    expect(tokens.refreshToken.length).toBeGreaterThan(10);
  });

  it("generateAccessToken returns access token string", async () => {
    const user = await createUser("jwt-utils-generate-access");
    const accessToken = await generateAccessToken(user.id);

    expect(typeof accessToken).toBe("string");
    expect(accessToken.length).toBeGreaterThan(10);
  });

  it("generateTokens throws when user does not exist", async () => {
    await expect(generateTokens(999999)).rejects.toThrow("Error user not found");
  });

  it("generateAccessToken throws when user does not exist", async () => {
    await expect(generateAccessToken(999999)).rejects.toThrow(
      "Error user not found"
    );
  });

  it("verifyAccessToken returns true for matching userId", async () => {
    const user = await createUser("jwt-utils-verify-access");
    const { accessToken } = await generateTokens(user.id);

    expect(verifyAccessToken(accessToken, user.id.toString())).toBe(true);
  });

  it("verifyAccessToken returns false for malformed token", () => {
    expect(verifyAccessToken("invalid-token", "1")).toBe(false);
  });

  it("verifyRefreshToken returns true for matching userId", async () => {
    const user = await createUser("jwt-utils-verify-refresh");
    const { refreshToken } = await generateTokens(user.id);

    expect(verifyRefreshToken(refreshToken, user.id.toString())).toBe(true);
  });

  it("verifyRefreshToken returns false for malformed token", () => {
    expect(verifyRefreshToken("invalid-token", "1")).toBe(false);
  });

  it("validateAccessToken returns 404 for missing username", async () => {
    const result = await validateAccessToken("unknown-user", "any-token");

    expect(result).toEqual({
      code: 404,
      error: "User not founded",
      valid: false,
      id: -1,
    });
  });

  it("validateAccessToken returns 401 for invalid token on existing user", async () => {
    const user = await createUser("jwt-utils-invalid-token");
    const result = await validateAccessToken(user.username, "invalid-token");

    expect(result).toEqual({
      code: 401,
      error: "Invalid or expired Token",
      valid: false,
      id: -1,
    });
  });

  it("validateAccessToken returns valid payload for matching token", async () => {
    const user = await createUser("jwt-utils-valid-token");
    const { accessToken } = await generateTokens(user.id);
    const result = await validateAccessToken(user.username, accessToken);

    expect(result.valid).toBe(true);
    expect(result.id).toBe(user.id);
    expect(result.code).toBe(200);
  });
});
