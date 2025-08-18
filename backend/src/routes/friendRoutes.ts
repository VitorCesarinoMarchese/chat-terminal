import { Router } from "express";
import { seeFriendRequestController, acceptFriendRequestController, rejectFriendRequestController, sendFriendInvitationController } from "../controllers/friend";


const router = Router();

router.post("/send", sendFriendInvitationController)
router.post("/accept", acceptFriendRequestController)
router.post("/reject", rejectFriendRequestController)
router.get("/friend-requests", seeFriendRequestController)

export default router
