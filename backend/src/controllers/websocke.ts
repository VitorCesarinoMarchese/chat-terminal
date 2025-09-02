import WebSocket, { WebSocketServer } from "ws";

export const websocketController = (wss: WebSocketServer) => {
  wss.on('connection', (ws: WebSocket) => {

    console.log("Client Connected")
    ws.send("Connected")

    ws.on('error', console.error);

    ws.on("message", (data) => {
      const parseData = JSON.parse(data.toString())

      if (parseData.type === 'chat') {

      }

      if (parseData.type === 'message') {

      }

    })
  })
}
