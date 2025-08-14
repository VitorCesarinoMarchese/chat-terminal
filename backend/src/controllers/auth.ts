import { Request, Response } from "express"
import bcrypt from "bcrypt"
import db from "../config/db";
import { generateAccessToken, generateTokens, verifyAccessToken, verifyRefreshToken } from "../utils/jwtUtils";
import { tryCatch } from "bullmq";
import { access } from "fs";

export const registerController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Missing data" })
      return;
    }

    const usernameExists = await db.user.findUnique({
      where: {
        username: username,
      }
    })
    if (usernameExists) {
      res.status(406).json({ error: "Username already in use" })
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

    res.status(201).json({ message: `User ${user.username} created suscessufuly`, refreshToken, accessToken })
  } catch (e) {
    res.status(500).json({ error: `Server erros` })
    console.error(e)
    return;
  }
}

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Missing data" })
      return;
    }

    const user = await db.user.findUnique({
      where: {
        username: username,
      }
    })
    if (!user) {
      res.status(404).json({ error: "User not found" })
      return
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (!isPasswordCorrect) {
      res.status(401).json({ error: "Incorrect password" })
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

    res.status(202).json({ accessToken: accessToken, refreshToken: refreshToken, message: `User ${user.username} logged suscessufuly` })
  } catch (e) {
    res.status(500).json({ error: `Server erros` })
    console.error(e)
    return;
  }
}

export const validateJWTController = async (req: Request, res: Response) => {
  try {
    const { token, refreshToken, userId } = req.body
    if (!token || !refreshToken || !userId) {
      res.status(400).json({ error: "Missing data" })
      return
    }

    const isAccessTokenValid = verifyAccessToken(token, userId)
    const isRefreshTokenValid = verifyRefreshToken(refreshToken, userId)

    if (!isAccessTokenValid && !isRefreshTokenValid) {
      res.status(401).json({ error: "Tokens invalid, please login again" })
      return
    }

    if (!isAccessTokenValid && isRefreshTokenValid) {
      try {
        const newAccessToken = generateAccessToken(userId)
        res.status(200).json({ accessToken: newAccessToken })
        return
      } catch (e) {
        res.status(500).json({ error: "Error generating a new access token" })
        return
      }

    }

    res.status(200).json({ accessToken: token, message: "Your access token is validated successfully" })
  } catch (e) {
    res.status(500).json({ error: `Internal server error` })
  }
}
