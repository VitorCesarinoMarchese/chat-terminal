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


    const userId = isTokenValid.id

    const chat = await db.chat.create({
      data: {
        name: name,
        userId: userId,
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
    await db.member.create({
      data: {
        chatId: chat.id,
        userId: userId,
        role: 'ADMIN'
      }
    })

    res.status(201).json({ message: `Chat ${name} created` })
  } catch (error) {
    res.status(500).json({ error: `Server erros` })
    return;
  }
}

export const getAllChats = async (req: Request, res: Response) => {
  try {
    const { username } = req.query
    if (!username || typeof username != 'string') {
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

    const userId = isTokenValid.id


    const userChats = await db.chat.findMany({
      where: {
        member: {
          some: {
            userId: userId
          }
        }
      },
      select: {
        name: true,
        member: {
          select: { user: { select: { username: true } } }
        }
      }
    })
    res.status(200).json({ message: "Chats find successefuly", userChats })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}

export const getChatsWithUser = async (req: Request, res: Response) => {
  try {
    const { username, findUser } = req.query
    if (!username || typeof username != 'string' || !findUser || typeof findUser != 'string') {
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

    const userId = isTokenValid.id

    const findUserExist = await db.user.findFirst({
      where: {
        username: username
      },
      select: {
        id: true
      }
    })

    if (!findUserExist) {
      res.status(400).json({ error: "Find user does not exist" })
      return
    }
    const findUserId = findUserExist.id

    const userChats = await db.chat.findMany({
      where: {
        AND: [
          {
            member: {
              some: {
                userId: userId
              }
            }
          },
          {
            member: {
              some: {
                userId: findUserId
              }
            }
          }
        ]
      },
      select: {
        name: true,
        member: {
          select: { user: { select: { username: true } } }
        }
      }
    })

    res.status(200).json({ message: "Chats find successefuly", userChats })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}
