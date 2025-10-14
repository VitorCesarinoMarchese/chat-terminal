import WebSocket, { WebSocketServer } from "ws";
import { validateAccessToken } from "../utils/jwtUtils";
import { chatValidation } from "../utils/chatUtils";
import { json } from "express";


interface Client {
  ws: WebSocket;
  userId: number;
  chatId: string;
}

const clients = new Map<WebSocket, Client>();

export const websocketController = (wss: WebSocketServer) => {
  wss.on('connection', (ws: WebSocket) => {

    console.log("Client Connected")
    ws.send("Connected")

    ws.on('error', console.error);

    ws.on("message", async (data) => {
      const parseData = JSON.parse(data.toString())

      switch (parseData.type) {
        case "join": {
          const { username, token, chatId } = parseData.payload;
          const tokenData = await validateAccessToken(username, token)

          if (!tokenData.valid) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
            ws.close();
            return;
          }

          const isChatValid = await chatValidation(chatId, tokenData.id);
          if (!isChatValid) {
            ws.send(JSON.stringify({ type: "error", message: "Chat not found or unauthorized" }));
            ws.close();
            return;
          }

          clients.set(ws, { ws, userId: tokenData.id, chatId })
          ws.send(JSON.stringify({ type: "joined", chatId }))

          console.log(`User ${username} joined the chat ${chatId}`)
          break;
        }

        case "chat": {

        }
      }
    })
  })
}
