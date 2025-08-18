import express from "express"
import http from "http"
// import cors from "cors"
import authRoutes from "../routes/authRoutes"
import friendRoutes from "../routes/friendRoutes"
import db from "./db"

export const createServer = () => {
  db.$connect()

  const app = express()
  const server = http.createServer(app)

  app.use(express.json())
  // app.use(
  //   cors({
  //     origin: "",
  //     credentials: true,
  //     methods: ["GET", "POST", "PUT", "DELETE"],
  //     allowedHeaders: ["Content-Type", "Authorization"],
  //   })
  // )

  app.use("/api/auth", authRoutes)
  app.use("/api/friend", friendRoutes)

  return { app, server }
}

export default createServer
