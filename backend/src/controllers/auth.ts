import { Request, Response } from "express"
import bcrypt from "bcrypt"
import db from "../config/db";
import { generateAccessToken, generateTokens, verifyAccessToken, verifyRefreshToken } from "../utils/jwtUtils";
import { sendError, sendSuccess } from "../utils/httpResponse";

export const registerController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      sendError(res, 400, "Missing data")
      return;
    }

    const usernameExists = await db.user.findUnique({
      where: {
        username: username,
      }
    })
    if (usernameExists) {
      sendError(res, 406, "Username already in use")
      return;
    }

    const hashPassword = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: {
        username: username,
        password: hashPassword,
        refreshToken: ""
      }
    })
    const { accessToken, refreshToken } = await generateTokens(user.id)

    db.user.update({
      where: {
        id: user.id
      },
      data: {
        refreshToken: refreshToken
      }
    })

    sendSuccess(
      res,
      201,
      `User ${user.username} created suscessufuly`,
      { refreshToken, accessToken }
    )
  } catch (e) {
    sendError(res, 500, "Server erros")
    console.error(e)
    return;
  }
}

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      sendError(res, 400, "Missing data")
      return;
    }

    const user = await db.user.findUnique({
      where: {
        username: username,
      }
    })
    if (!user) {
      sendError(res, 404, "User not found")
      return
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (!isPasswordCorrect) {
      sendError(res, 401, "Incorrect password")
      return;
    }

    const { accessToken, refreshToken } = await generateTokens(user.id)

    db.user.update({
      where: {
        id: user.id
      },
      data: {
        refreshToken: refreshToken
      }
    })

    sendSuccess(
      res,
      202,
      `User ${user.username} logged suscessufuly`,
      { accessToken, refreshToken }
    )
  } catch (e) {
    sendError(res, 500, "Server erros")
    console.error(e)
    return;
  }
}

export const validateJWTController = async (req: Request, res: Response) => {
  try {
    const { token, refreshToken, userId } = req.body
    if (!token || !refreshToken || !userId) {
      sendError(res, 400, "Missing data")
      return
    }

    const isAccessTokenValid = verifyAccessToken(token, userId)
    const isRefreshTokenValid = verifyRefreshToken(refreshToken, userId)

    if (!isAccessTokenValid && !isRefreshTokenValid) {
      sendError(res, 401, "Tokens invalid, please login again")
      return
    }

    if (!isAccessTokenValid && isRefreshTokenValid) {
      try {
        const newAccessToken = await generateAccessToken(userId)
        sendSuccess(res, 200, "Generated new access token", { accessToken: newAccessToken })
        return
      } catch (e) {
        sendError(res, 500, "Error generating a new access token")
        return
      }

    }

    sendSuccess(res, 200, "Your access token is validated successfully", { accessToken: token })
  } catch (e) {
    sendError(res, 500, "Internal server error")
  }
}
