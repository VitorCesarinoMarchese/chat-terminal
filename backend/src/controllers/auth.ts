import { Request, Response } from "express"
import bcrypt from "bcrypt"
import db from "../config/db";

export const registerController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Missing data" })
      return;
    }

    const verifyEmail = await db.user.findUnique({
      where: {
        username: username,
      }
    })

    if (verifyEmail) {
      res.status(400).json({ error: "Username already in use" })
      return;
    }

    const hashPassword = await bcrypt.hash(password, 10)

    const user = await db.user.create({
      data: {
        username: username,
        password: hashPassword
      }
    })

    res.status(201).json({ message: `User ${user.username} created suscessufuly` })
  } catch (e) {
    res.status(500).json({ error: `Server erros` })
    console.error(e)
    return;
  }
}
