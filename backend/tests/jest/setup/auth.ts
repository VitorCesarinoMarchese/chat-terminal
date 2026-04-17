import jwt from "jsonwebtoken";
import { postJson, readJson } from "./http";

export type UserSession = {
  username: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  userId: number;
};

function decodeUserId(token: string) {
  const decoded = jwt.decode(token) as jwt.JwtPayload | null;
  if (!decoded || typeof decoded.userId !== "number") {
    throw new Error("Invalid test token payload");
  }
  return decoded.userId;
}

export async function registerUser(
  baseUrl: string,
  username: string,
  password = "p@ssword123"
): Promise<UserSession> {
  const response = await postJson(baseUrl, "/api/auth/register", {
    username,
    password,
  });

  const body = await readJson<{
    accessToken: string;
    refreshToken: string;
  }>(response);

  if (response.status !== 201) {
    throw new Error(`registerUser failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return {
    username,
    password,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: decodeUserId(body.accessToken),
  };
}

export async function loginUser(
  baseUrl: string,
  username: string,
  password: string
): Promise<UserSession> {
  const response = await postJson(baseUrl, "/api/auth/login", {
    username,
    password,
  });
  const body = await readJson<{
    accessToken: string;
    refreshToken: string;
  }>(response);

  if (response.status !== 202) {
    throw new Error(`loginUser failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return {
    username,
    password,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: decodeUserId(body.accessToken),
  };
}
