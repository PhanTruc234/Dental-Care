import { Router } from "express";
import authRoute from "../modules/auth/auth.route.js";
import specialtyRoute from "../modules/specialty/specialty.route.js";
import staffRoute from "../modules/staff/staff.route.js";
import userRoute from "../modules/user/user.route.js";
import serviceCategoryRoute from "../modules/service-category/service-category.route.js";
import serviceRoute from "../modules/service/service.route.js";
import manufacturerRoute from "../modules/manufacturer/manufacturer.route.js";
import medicineRoute from "../modules/medicine/medicine.route.js";
const router = Router()
router.use("/auth", authRoute)
router.use("/users", userRoute);
router.use("/staff", staffRoute);
router.use("/specialties", specialtyRoute);
router.use("/service-categories", serviceCategoryRoute);
router.use("/services", serviceRoute);
router.use("/manufacturers", manufacturerRoute);
router.use("/medicines", medicineRoute);
export default router