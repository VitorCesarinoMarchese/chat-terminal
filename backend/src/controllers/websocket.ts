import WebSocket, { WebSocketServer } from "ws"
import { validateAccessToken } from "../utils/jwtUtils"
import { chatValidation } from "../utils/chatUtils"
import z from "zod"

interface Client {
  ws: WebSocket
  userId: number
  chatId: string
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
          if (safePayload.success) {
            console.error("Schema error:", safePayload.error)
            ws.send(JSON.stringify({
              error: "Invalid payload structure",
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

          clients.set(ws, { ws, userId: tokenData.id, chatId })
          ws.send(JSON.stringify({ type: "joined", chatId }))

          console.log(`User ${username} joined the chat ${chatId}`)
          break
        }

        case "chat": {

          const safePayload = ChatPayloadSchema.safeParse(message.payload)
          if (safePayload.success) {
            console.error("Schema error:", safePayload.error)
            ws.send(JSON.stringify({
              error: "Invalid payload structure",
              details: safePayload.error,
            }))
            return
          }

          const { username, token, text } = message.payload
          const tokenData = await validateAccessToken(username, token)

          if (!tokenData.valid) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid token" }))
            ws.close()
            return
          }

          if (!clients.has(ws)) {
            console.error("Client dosen't have joined a chat\n websocket:", ws)
            ws.send("You are not in a chat, join one before sending messages")
            return
          }

        }
      }
    })
  })
}
