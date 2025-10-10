import WebSocket, { WebSocketServer } from "ws";
import { validateAccessToken } from "../utils/jwtUtils";
import { chatValidation } from "../utils/chatUtils";

export const websocketController = (wss: WebSocketServer) => {
  wss.on('connection', (ws: WebSocket) => {

    console.log("Client Connected")
    ws.send("Connected")

    ws.on('error', console.error);

    ws.on("message", async (data) => {
      const parseData = JSON.parse(data.toString())

      if (parseData.type === 'join') {
        const token = await validateAccessToken(parseData.payload.username, parseData.payload.token)
        if (token.valid) {
          const isChatValid = await chatValidation(parseData.payload.chatId, token.id)
          if (isChatValid) {

          }
        } else {
          ws.send("Invalid token")
        }
      }

      if (parseData.type === 'chat') {

      }

    })
  })
}
