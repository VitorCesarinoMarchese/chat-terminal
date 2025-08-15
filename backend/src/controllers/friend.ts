import { Request, Response } from "express"
import { verifyAccessToken } from "../utils/jwtUtils"
import db from "../config/db"

export const sentFriendInvitationController = async (req: Request, res: Response) => {
  try {
    const headerToken = req.headers['authorization']
    const { senderId, receiverUsername } = req.body
    if (!senderId || !receiverUsername) {
      res.status(400).json({ error: "Missing data" })
      return
    }

    if (!headerToken) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const isAccessTokenValid = verifyAccessToken(headerToken, receiverUsername)
    if (!isAccessTokenValid) {
      res.status(403).json({ error: "Invalid or expired Token" });
      return
    }

    const receiver = await db.user.findUnique({
      where: {
        username: receiverUsername
      },
      select: { id: true }
    })
    if (!receiver) {
      res.status(400).json({ error: "User not found" })
      return
    }

    if (receiver.id == senderId) {
      res.status(400).json({ error: "You can't send a friend request to yourself" })
    }

    const isRequested = await db.friendship.findFirst({
      where: {
        OR: [
          { receiverId: receiver.id, requesterId: senderId },
          { receiverId: senderId, requesterId: receiver.id }
        ]
      },
      select: { id: true }
    })
    if (isRequested) {
      res.status(409).json({ error: "Friendship request already exists" })
      return
    }

    const friendRequest = await db.friendship.create({
      data: {
        receiverId: receiver.id,
        requesterId: senderId,
      },
      select: { id: true, requesterId: true, receiverId: true }
    })

    res.status(201).json({ message: "Friendship request sent successufuly", request: friendRequest })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}
