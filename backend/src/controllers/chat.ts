import { Request, Response } from "express"
import { validateAccessToken } from "../utils/jwtUtils"
import { getUserId, isUserValid } from "../utils/userUtils"
import db from "../config/db"

export const createChatController = async (req: Request, res: Response) => {
  try {
    const { name, username, members } = req.body
    if (!name || !username || !members || !Array.isArray(members)) {
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

    const chat = await db.chat.create({
      data: {
        name: name,
        userId: isTokenValid.id,
      },
      select: { id: true }
    })

    members.map(async (member: string) => {
      const validUser = await isUserValid(member)
      if (!validUser) {
        res.status(400).json({ error: `User ${member} is not valid` })
        return
      } else {
        await db.member.create({
          data: {
            chatId: chat.id,
            userId: await getUserId(member),
            role: 'USER'
          }
        })
      }
    })
    res.status(201).json({ message: `Chat ${name} created` })
  } catch (error) {
    res.status(500).json({ error: `Server erros` })
    return;
  }
}

export const seeAllChats = async (req: Request, res: Response) => {
  const { username, members } = req.body
  if (!username || !members || !Array.isArray(members)) {
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
