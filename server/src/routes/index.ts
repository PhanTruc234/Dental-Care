import { Router } from "express";
import authRoute from "../modules/auth/auth.route.js";
import specialtyRoute from "../modules/specialty/specialty.route.js";
import staffRoute from "../modules/staff/staff.route.js";
import userRoute from "../modules/user/user.route.js";
const router = Router()
router.use("/auth", authRoute)
router.use("/users", userRoute);
router.use("/staff", staffRoute);
router.use("/specialties", specialtyRoute);
export default router