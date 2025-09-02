import express from "express";
import http from "http";
import authRoutes from "../routes/authRoutes";
import chatRoutes from "../routes/chatRoutes";
import friendRoutes from "../routes/friendRoutes";
import db from "./db";

export const createServer = () => {
  db.$connect()

  const app = express()
  const server = http.createServer(app)

  app.use(express.json())

  app.use("/api/auth", authRoutes)
  app.use("/api/friend", friendRoutes)
  app.use("/api/chat", chatRoutes)

  return { app, server }
}

export default createServer
