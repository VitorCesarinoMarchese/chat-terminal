import db from "../config/db"

export const isUserValid = async (username: string): Promise<boolean> => {
  try {
    const user = await db.user.findUnique({
      where: {
        username: username,
      }
    })
    if (!user) {
      return false
    }
    return true
  } catch (e) {
    console.error("Error validating user", e)
    return false
  }
}
export const getUserId = async (username: string): Promise<number> => {
  try {
    const user = await db.user.findUnique({
      where: {
        username: username,
      },
      select: { id: true }
    })
    if (!user) {
      return -1
    }
    return user.id
  } catch (e) {
    console.error("Error validating user", e)
    return -1
  }
}
