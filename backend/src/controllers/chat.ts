import { Request, Response } from "express"
import { validateAccessToken } from "../utils/jwtUtils"
import { getUserId, isUserValid } from "../utils/userUtils"
import db from "../config/db"
import { sendError, sendSuccess } from "../utils/httpResponse"

export const createChatController = async (req: Request, res: Response) => {
  try {
    const { name, username, members } = req.body
    if (!name || !username || !members || !Array.isArray(members)) {
      sendError(res, 400, "Missing data")
      return
    }

    let headerToken = req.headers['authorization']
    if (!headerToken) {
      sendError(res, 401, "Access denied");
      return;
    }
    if (headerToken.startsWith("Bearer ")) {
      headerToken = headerToken.slice(7);
    }

    const isTokenValid = await validateAccessToken(username, headerToken)

    if (!isTokenValid.valid) {
      sendError(res, isTokenValid.code, isTokenValid.error)
      return
    }


    const userId = isTokenValid.id

    const memberIds: number[] = []
    for (const member of members) {
      if (typeof member !== "string" || member.trim().length === 0) {
        sendError(res, 400, "Invalid member username")
        return
      }

      const validUser = await isUserValid(member)
      if (!validUser) {
        sendError(res, 400, `User ${member} is not valid`)
        return
      }

      const memberId = await getUserId(member)
      if (memberId === -1) {
        sendError(res, 400, `User ${member} is not valid`)
        return
      }

      if (memberId !== userId && !memberIds.includes(memberId)) {
        memberIds.push(memberId)
      }
    }

    await db.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          name: name,
          userId: userId,
        },
        select: { id: true }
      })

      if (memberIds.length > 0) {
        await tx.member.createMany({
          data: memberIds.map((memberId) => ({
            chatId: chat.id,
            userId: memberId,
            role: "USER"
          }))
        })
      }

      await tx.member.create({
        data: {
          chatId: chat.id,
          userId: userId,
          role: 'ADMIN'
        }
      })
    })

    sendSuccess(res, 201, `Chat ${name} created`, {})
  } catch (error) {
    sendError(res, 500, "Server erros")
    return;
  }
}

export const getAllChats = async (req: Request, res: Response) => {
  try {
    const { username } = req.query
    if (!username || typeof username != 'string') {
      sendError(res, 400, "Missing data")
      return
    }

    let headerToken = req.headers['authorization']
    if (!headerToken) {
      sendError(res, 401, "Access denied");
      return;
    }
    if (headerToken.startsWith("Bearer ")) {
      headerToken = headerToken.slice(7);
    }

    const isTokenValid = await validateAccessToken(username, headerToken)

    if (!isTokenValid.valid) {
      sendError(res, isTokenValid.code, isTokenValid.error)
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
    sendSuccess(res, 200, "Chats find successefuly", { userChats })
  } catch (e) {
    sendError(res, 500, "Internal server error")
  }
}

export const getChatsWithUser = async (req: Request, res: Response) => {
  try {
    const { username, findUser } = req.query
    if (!username || typeof username != 'string' || !findUser || typeof findUser != 'string') {
      sendError(res, 400, "Missing data")
      return
    }

    let headerToken = req.headers['authorization']
    if (!headerToken) {
      sendError(res, 401, "Access denied");
      return;
    }
    if (headerToken.startsWith("Bearer ")) {
      headerToken = headerToken.slice(7);
    }

    const isTokenValid = await validateAccessToken(username, headerToken)

    if (!isTokenValid.valid) {
      sendError(res, isTokenValid.code, isTokenValid.error)
      return
    }

    const userId = isTokenValid.id

    const findUserExist = await db.user.findFirst({
      where: {
        username: findUser
      },
      select: {
        id: true
      }
    })

    if (!findUserExist) {
      sendError(res, 400, "User does not exist")
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

    sendSuccess(res, 200, "Chats find successefuly", { userChats })
  } catch (e) {
    sendError(res, 500, "Internal server error")
  }
}
