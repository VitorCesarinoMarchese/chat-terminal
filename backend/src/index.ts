import { createServer } from "./config/server"
import dotenv from "dotenv"

dotenv.config()

const port = process.env.PORT || 8080

const { app, server } = createServer()

app.listen(port, () => {
  console.log(`server running in http://localhost:${port}`)
})
