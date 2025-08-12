import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import db from "../config/db"
dotenv.config()

type generatedTokens = {
  accessToken: string,
  refreshToken: string
}

export const generateTokens = async (userId: number): Promise<generatedTokens> => {
  const jwtSecret = process.env.JWT_SECRET!
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!
  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error("Error missing jwt env variable")
  }

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
    { expiresIn: "7d" }
  )


  return { accessToken, refreshToken }
}
