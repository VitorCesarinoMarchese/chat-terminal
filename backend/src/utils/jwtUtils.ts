import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import db from "../config/db"
dotenv.config()

type generatedTokens = {
  accessToken: string,
  refreshToken: string
}

type validateToken = {
  code: number,
  error: string,
  valid: boolean,
  id: number
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

export const validateAccessToken = async (username: string, headerToken: string): Promise<validateToken> => {
  const user = await db.user.findUnique({
    where: {
      username: username
    },
    select: { id: true }
  })
  if (!user) {
    return { code: 404, error: "User not founded", valid: false, id: -1 }
  }
  const userId = user.id

  const isAccessTokenValid = verifyAccessToken(headerToken, userId.toString())
  if (!isAccessTokenValid) {
    return { code: 401, error: "Invalid or expired Token", valid: false, id: -1 }
  }
  return { valid: true, id: userId, code: 200, error: "" }
}
