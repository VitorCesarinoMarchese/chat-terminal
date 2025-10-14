import db from "../config/db"
import { isUserIdValid } from "./userUtils"

export const chatValidation = async (chatId: number, userId: number) => {
  try {
    if (!isUserIdValid(userId)) {
      return false
    }

    const chat = await db.chat.findUnique({
      where: {
        id: chatId,
      },
      select: {
        member: {
          select: { user: { select: { id: true } } }
        }
      }
    })

    if (!chat) {
      return false
    }

    if (!chat.member.some(m => m.user.id === userId)) {
      return false
    }

    return true
  } catch (e) {
    console.error(e)
    return false
  }

}
