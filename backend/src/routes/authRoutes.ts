import { Router } from "express";
import { loginController, registerController, validateJWTController } from "../controllers/auth";


const router = Router();

router.post("/register", registerController)
router.post("/login", loginController)
router.post("/jwt", validateJWTController)

export default router
