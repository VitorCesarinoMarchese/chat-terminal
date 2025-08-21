import { Request, Response } from "express"
import { validateAccessToken, verifyAccessToken } from "../utils/jwtUtils"
import db from "../config/db"

export const sendFriendInvitationController = async (req: Request, res: Response) => {
  try {
    const { senderUsername, receiverUsername } = req.body
    if (!senderUsername || !receiverUsername) {
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

    const isTokenValid = await validateAccessToken(senderUsername, headerToken)

    if (!isTokenValid.valid) {
      res.status(isTokenValid.code).json({ error: isTokenValid.error })
      return
    }
    const senderId = isTokenValid.id

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
    const { requestId, username } = req.body
    if (!requestId || !username) {
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

    res.status(200).json({ message: "Friendship request accepted successufuly", request: friendRequest })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" + e })
  }
}

export const rejectFriendRequestController = async (req: Request, res: Response) => {
  try {
    const { requestId, username } = req.body
    if (!requestId || !username) {
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

    res.status(200).json({ message: "Friendship request rejected successufuly", request: friendRequest })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}

export const seeFriendRequestController = async (req: Request, res: Response) => {
  try {
    const { username } = req.query
    if (!username || typeof username !== 'string') {
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

    const friends = await db.friendship.findMany({
      where: {
        OR: [
          { receiverId: userId },
          { requesterId: userId }
        ],
        AND: {
          NOT:
          {
            OR: [
              { status: "ACCEPTED" },
              { status: "REJECTED" }
            ]
          }
        }
      },
      select: {
        id: true,
        status: true,
        receiver: { select: { username: true } },
        requester: { select: { username: true } }
      }
    })
    res.status(200).json({ friendRequests: friends })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}

export const seeFriendListsController = async (req: Request, res: Response) => {
  try {
    const { username } = req.query
    if (!username || typeof username !== 'string') {
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

    const friends = await db.friendship.findMany({
      where: {
        OR: [
          { receiverId: userId },
          { requesterId: userId }
        ]
      },
      select: {
        id: true,
        status: true,
        receiver: { select: { username: true } },
        requester: { select: { username: true } }
      }
    })
    res.status(200).json({ friendRequests: friends })
  } catch (e) {
    res.status(500).json({ error: "Internal server error" })
  }
}
