import { Request, Response } from "express"
import db from "../config/db"
import { validateAccessToken, verifyAccessToken } from "../utils/jwtUtils"

export const createGroupController = async (req: Request, res: Response) => {

  const { username, members } = req.body
  if (!username || !members) {
    res.status(400).json({ error: "Missing data" })
    return
  }

  let headerToken = req.headers['authorization']
  if (!headerToken) {
    res.status(401).json({ error: "Access denied" });
    return;
  }
  if (headerToken.startsWith("Bearer ")) {
    headerToken = headerToken.slice(7);
  }

  const isTokenValid = await validateAccessToken(username, headerToken)

  if (!isTokenValid.valid) {
    res.status(isTokenValid.code).json({ error: isTokenValid.error })
    return
  }

}
