import { Router } from "express";
import { createChatController, getAllChats, getChatsWithUser } from "../controllers/chat";


const router = Router();

router.post("/create", createChatController)
router.get("/all", getAllChats)
router.get("/with", getChatsWithUser)

export default router
