import { Request, Response } from "express"
import { verifyAccessToken } from "../utils/jwtUtils"
import db from "../config/db"

export const sentFriendInvitationController = async (req: Request, res: Response) => {
  try {
    const headerToken = req.headers['authorization']
    const { senderUsername, receiverUsername } = req.body
    if (!senderUsername || !receiverUsername) {
      res.status(400).json({ error: "Missing data" })
      return
    }

    if (!headerToken) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const sender = await db.user.findUnique({
      where: {
        username: senderUsername
      },
      select: { id: true }
    })
    if (!sender) {
      res.status(400).json({ error: "Your user is incorrect" })
      return
    }
    const senderId = sender.id

    const isAccessTokenValid = verifyAccessToken(headerToken, senderId.toString())
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
      select: { id: true, status: true }
    })

    res.status(201).json({ message: "Friendship request sent successufuly", request: friendRequest })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}

export const acceptFriendRequestController = async (req: Request, res: Response) => {
  try {
    const headerToken = req.headers['authorization']
    const { requestId, username } = req.body
    if (!requestId || !username) {
      res.status(400).json({ error: "Missing data" })
      return
    }

    if (!headerToken) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const user = await db.user.findUnique({
      where: {
        username: username
      },
      select: { id: true }
    })
    if (!user) {
      res.status(400).json({ error: "Your user is incorrect" })
      return
    }
    const userId = user.id

    const isAccessTokenValid = verifyAccessToken(headerToken, userId.toString())
    if (!isAccessTokenValid) {
      res.status(403).json({ error: "Invalid or expired Token" });
      return
    }

    const isRequested = await db.friendship.findFirst({
      where: {
        id: requestId
      },
      select: { id: true, status: true }
    })
    if (!isRequested) {
      res.status(400).json({ error: "Friendship request does not exists" })
      return
    }

    const friendRequest = await db.friendship.update({
      where: {
        id: requestId
      },
      data: {
        status: 'ACCEPTED'
      },
      select: { id: true, status: true }
    })

    res.status(201).json({ message: "Friendship request accepted successufuly", request: friendRequest })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}

export const regectFriendRequestController = async (req: Request, res: Response) => {
  try {
    const headerToken = req.headers['authorization']
    const { requestId, username } = req.body
    if (!requestId || !username) {
      res.status(400).json({ error: "Missing data" })
      return
    }

    if (!headerToken) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const user = await db.user.findUnique({
      where: {
        username: username
      },
      select: { id: true }
    })
    if (!user) {
      res.status(400).json({ error: "Your user is incorrect" })
      return
    }
    const userId = user.id

    const isAccessTokenValid = verifyAccessToken(headerToken, userId.toString())
    if (!isAccessTokenValid) {
      res.status(403).json({ error: "Invalid or expired Token" });
      return
    }

    const isRequested = await db.friendship.findFirst({
      where: {
        id: requestId
      },
      select: { id: true, status: true }
    })
    if (!isRequested) {
      res.status(400).json({ error: "Friendship request does not exists" })
      return
    }

    const friendRequest = await db.friendship.update({
      where: {
        id: requestId
      },
      data: {
        status: 'REJECTED'
      },
      select: { id: true, status: true }
    })

    res.status(201).json({ message: "Friendship request rejected successufuly", request: friendRequest })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}
