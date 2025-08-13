import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import db from "../config/db"
dotenv.config()

type generatedTokens = {
  accessToken: string,
  refreshToken: string
}

const jwtSecret = process.env.JWT_SECRET!
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!
if (!jwtSecret || !jwtRefreshSecret) {
  throw new Error("Error missing jwt env variable")
}

export const generateTokens = async (userId: number): Promise<generatedTokens> => {

  const user = db.user.findUnique({
    where: {
      id: userId
    }
  })
  if (!user) {
    throw new Error("Error user not found")
  }

  const accessToken = jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: "15m" }
  )
  const refreshToken = jwt.sign(
    { userId },
    jwtRefreshSecret,
    { expiresIn: "14d" }
  )

  return { accessToken, refreshToken }
}

export const generateAccessToken = async (userId: number): Promise<string> => {

  const user = db.user.findUnique({
    where: {
      id: userId
    }
  })
  if (!user) {
    throw new Error("Error user not found")
  }

  const accessToken = jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: "15m" }
  )

  return accessToken
}

export const verifyAccessToken = (token: string, userId: string): boolean => {
  try {
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload
    return decoded.userId == userId
  } catch (e) {
    return false
  }
}

export const verifyRefreshToken = (token: string, userId: string): boolean => {
  try {
    const decoded = jwt.verify(token, jwtRefreshSecret) as jwt.JwtPayload
    return decoded.userId == userId
  } catch (e) {
    return false
  }
}
