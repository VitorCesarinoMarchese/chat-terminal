import { Router } from "express";
import { seeFriendRequestController, acceptFriendRequestController, rejectFriendRequestController, sendFriendInvitationController, seeFriendListsController } from "../controllers/friend";


const router = Router();

router.post("/send", sendFriendInvitationController)
router.post("/accept", acceptFriendRequestController)
router.post("/reject", rejectFriendRequestController)
router.get("/requests", seeFriendRequestController)
router.get("/list", seeFriendListsController)

export default router
