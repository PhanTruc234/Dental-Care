import { Router } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { verifyUser } from "../../shared/middlewares/auth.middleware.js";
import { requireRole } from "../../shared/middlewares/permission.middleware.js";
import { validate } from "../../shared/middlewares/validate.js";
import * as staffController from "./staff.controller.js";
import { CreateStaffBody, ListStaffQuery, StaffIdParams, UpdateStaffBody } from "./staff.schema.js";

const router = Router();
router.use(verifyUser);

// Đọc: mọi nhân viên. Lễ tân cần xem danh sách nha sĩ để đặt lịch (GĐ 5).
const anyStaff = requireRole(Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST, Role.ASSISTANT);

router.get("/", anyStaff, validate({ query: ListStaffQuery }), staffController.listStaff);
router.get("/:staffId", anyStaff, validate({ params: StaffIdParams }), staffController.getStaff);

router.post("/", requireRole(Role.ADMIN),
    validate({ body: CreateStaffBody }), staffController.createStaff);
router.patch("/:staffId", requireRole(Role.ADMIN),
    validate({ params: StaffIdParams, body: UpdateStaffBody }), staffController.updateStaff);

export default router;