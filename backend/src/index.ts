import { WebSocketServer } from "ws"
import { createServer } from "./config/server"
import dotenv from "dotenv"
import { websocketController } from "./controllers/websocke"

dotenv.config()

const port = process.env.PORT || 8080
const wsPort = process.env.PORT || 3030

const { app, server } = createServer()

const wss = new WebSocketServer({ server })
websocketController(wss)

app.listen(port, () => {
  console.log(`server running in http://localhost:${port}`)
})

server.listen(wsPort, () => {
  console.log(`WebSocket server running on ws://localhost:${wsPort}`)
})
