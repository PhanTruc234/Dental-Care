import { Router } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { verifyUser } from "../../shared/middlewares/auth.middleware.js";
import { requireRole } from "../../shared/middlewares/permission.middleware.js";
import { validate } from "../../shared/middlewares/validate.js";
import * as ctrl from "./medicine.controller.js";
import { CreateMedicineBody, ListMedicinesQuery, MedicineIdParams, UpdateMedicineBody } from "./medicine.schema.js";

const router = Router();
router.use(verifyUser);
const anyStaff = requireRole(Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST, Role.ASSISTANT);

router.get("/", anyStaff, validate({ query: ListMedicinesQuery }), ctrl.listMedicines);
router.get("/:medicineId", anyStaff, validate({ params: MedicineIdParams }), ctrl.getMedicine);
router.post("/", requireRole(Role.ADMIN), validate({ body: CreateMedicineBody }), ctrl.createMedicine);
router.patch("/:medicineId", requireRole(Role.ADMIN),
    validate({ params: MedicineIdParams, body: UpdateMedicineBody }), ctrl.updateMedicine);

export default router;