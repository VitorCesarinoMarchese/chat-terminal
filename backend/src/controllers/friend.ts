import { Request, Response } from "express"
import { validateAccessToken, verifyAccessToken } from "../utils/jwtUtils"
import db from "../config/db"
import { sendError, sendSuccess } from "../utils/httpResponse"

export const sendFriendInvitationController = async (req: Request, res: Response) => {
  try {
    const { senderUsername, receiverUsername } = req.body
    if (!senderUsername || !receiverUsername) {
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

    const isTokenValid = await validateAccessToken(senderUsername, headerToken)

    if (!isTokenValid.valid) {
      sendError(res, isTokenValid.code, isTokenValid.error)
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
      sendError(res, 400, "User not found")
      return
    }

    if (receiver.id == senderId) {
      sendError(res, 400, "You can't send a friend request to yourself")
      return
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
      sendError(res, 409, "Friendship request already exists")
      return
    }

    const friendRequest = await db.friendship.create({
      data: {
        receiverId: receiver.id,
        requesterId: senderId,
      },
      select: { id: true, status: true }
    })

    sendSuccess(res, 201, "Friendship request sent successufuly", { request: friendRequest })
  } catch (e) {
    sendError(res, 500, "Internal server error")
  }
}

export const acceptFriendRequestController = async (req: Request, res: Response) => {
  try {
    const { requestId, username } = req.body
    if (!requestId || !username) {
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

    const isRequested = await db.friendship.findFirst({
      where: {
        id: requestId
      },
      select: { id: true, status: true, receiverId: true }
    })
    if (!isRequested) {
      sendError(res, 400, "Friendship request does not exists")
      return
    }
    if (isRequested.receiverId !== userId) {
      sendError(res, 403, "Only receiver can accept this request")
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

    sendSuccess(res, 200, "Friendship request accepted successufuly", { request: friendRequest })
  } catch (e) {
    sendError(res, 500, "Internal server error")
  }
}

export const rejectFriendRequestController = async (req: Request, res: Response) => {
  try {
    const { requestId, username } = req.body
    if (!requestId || !username) {
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
    const isRequested = await db.friendship.findFirst({
      where: {
        id: requestId
      },
      select: { id: true, status: true, receiverId: true }
    })
    if (!isRequested) {
      sendError(res, 400, "Friendship request does not exists")
      return
    }
    if (isRequested.receiverId !== userId) {
      sendError(res, 403, "Only receiver can reject this request")
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

    sendSuccess(res, 200, "Friendship request rejected successufuly", { request: friendRequest })
  } catch (e) {
    sendError(res, 500, "Internal server error")
  }
}

export const seeFriendRequestController = async (req: Request, res: Response) => {
  try {
    const { username } = req.query
    if (!username || typeof username !== 'string') {
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
    sendSuccess(res, 200, "Friend requests fetched successfully", { friendRequests: friends })
  } catch (e) {
    sendError(res, 500, "Internal server error")
  }
}

export const seeFriendListsController = async (req: Request, res: Response) => {
  try {
    const { username } = req.query
    if (!username || typeof username !== 'string') {
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
    sendSuccess(res, 200, "Friend list fetched successfully", { friendRequests: friends })
  } catch (e) {
    sendError(res, 500, "Internal server error")
  }
}
