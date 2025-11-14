import WebSocket, { WebSocketServer } from "ws"
import { validateAccessToken } from "../utils/jwtUtils"
import { chatValidation } from "../utils/chatUtils"
import z from "zod"
import db from "../config/db"

interface Client {
  ws: WebSocket
  userId: number
  chatId: number
  lastMessageTime?: number
}

const MessageSchema = z.object({
  type: z.string(),
  payload: z.any()
})

const JoinPayloadSchema = z.object({
  username: z.string(),
  token: z.string(),
  chatId: z.string()
})

const ChatPayloadSchema = z.object({
  username: z.string(),
  token: z.string(),
  text: z.string()
})

const clients = new Map<WebSocket, Client>()

export const websocketController = (wss: WebSocketServer) => {
  wss.on('connection', (ws: WebSocket) => {

    console.log("Client Connected")
    ws.send("Connected")

    ws.on('error', console.error)

    ws.on('close', () => {
      const client = clients.get(ws)
      if (client) {
        console.log(`Client ${client.userId} disconnected from chat ${client.chatId}`)
      }
      clients.delete(ws)
    })

    ws.on("message", async (data) => {
      let parseData
      try {
        parseData = JSON.parse(data.toString())
      } catch (e) {
        console.error("Invalid JSON received:", data.toString())
        ws.send(JSON.stringify({
          error: "Invalid JSON format",
        }))
        return
      }

      const safeData = MessageSchema.safeParse(parseData)

      if (!safeData.success) {
        console.error("Schema error:", safeData.error)
        ws.send(JSON.stringify({
          error: "Invalid message structure",
          details: safeData.error,
        }))
        return
      }

      const message = safeData.data

      switch (message.type) {

        case "join": {

          const safePayload = JoinPayloadSchema.safeParse(message.payload)
          if (!safePayload.success) {
            console.error("Schema error:", safePayload.error)
            ws.send(JSON.stringify({
              type: "error",
              message: "Invalid payload structure",
              details: safePayload.error,
            }))
            return
          }

          const { username, token, chatId } = message.payload
          const tokenData = await validateAccessToken(username, token)

          if (!tokenData.valid) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid token" }))
            ws.close()
            return
          }

          const isChatValid = await chatValidation(chatId, tokenData.id)
          if (!isChatValid) {
            ws.send(JSON.stringify({ type: "error", message: "Chat not found or unauthorized" }))
            ws.close()
            return
          }

          const existingClient = clients.get(ws)

          if (existingClient) {
            const oldChatId = existingClient.chatId
            console.log(`user ${username} leaving chat ${oldChatId}`)

            clients.forEach((otherClient) => {
              if (otherClient.chatId === oldChatId && otherClient.ws !== ws) {
                otherClient.ws.send(JSON.stringify({
                  type: "user_left",
                  data: { username, chatId: oldChatId }
                }))
              }
            })
          }

          clients.set(ws, { ws, userId: tokenData.id, chatId: Number(chatId) })
          ws.send(JSON.stringify({ type: "joined", chatId: Number(chatId) }))

          clients.forEach((otherClient) => {
            if (otherClient.chatId === chatId && otherClient.ws !== ws) {
              otherClient.ws.send(JSON.stringify({
                type: "user_joined",
                data: { username, chatId: Number(chatId) }
              }))
            }
          })

          console.log(`User ${username} joined the chat ${chatId}`)
          break
        }

        case "chat": {

          const safePayload = ChatPayloadSchema.safeParse(message.payload)
          if (!safePayload.success) {
            console.error("Schema error:", safePayload.error)
            ws.send(JSON.stringify({
              type: "error",
              message: "Invalid payload structure",
              details: safePayload.error,
            }))
            return
          }

          const { username, text } = message.payload

          if (!clients.has(ws)) {
            console.error("Client doesn't have joined the chat\n userId:", username)
            ws.send(JSON.stringify({
              type: "error",
              message: "You are not in a chat, join one before sending messages"
            }))
            return
          }

          const client = clients.get(ws)!
          const { chatId, userId } = client
          const now = Date.now()
          if (client.lastMessageTime && now - client.lastMessageTime < 500) {
            ws.send(JSON.stringify({ type: "error", message: "Too many messages" }))
            return
          }
          client.lastMessageTime = now

          try {
            const dbMessage = await db.message.create({
              data: {
                userId,
                text,
                chatId
              }
            })
            console.log(`message created in db: ${dbMessage}`)

            clients.forEach((otherClient) => {
              if (otherClient.chatId === chatId) {
                otherClient.ws.send(JSON.stringify({
                  type: "message", data: {
                    id: dbMessage.id,
                    username,
                    text,
                    timestamp: dbMessage.sentAt
                  }
                }))
                console.log(`Message Sent to user: ${otherClient.userId}`)
              }
            })

          } catch (e) {
            console.error(`error during message sending: ${e}`)
            ws.send(JSON.stringify({
              type: "error",
              message: "Failed to send message",
            }))
          }

          break
        }
        default: {
          ws.send(JSON.stringify({
            type: "error",
            message: `Unknown message type: ${message.type}`
          }))
        }
      }
    })
  })
}
