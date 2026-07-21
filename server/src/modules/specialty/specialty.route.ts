import { Router } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { verifyUser } from "../../shared/middlewares/auth.middleware.js";
import { requireRole } from "../../shared/middlewares/permission.middleware.js";
import { validate } from "../../shared/middlewares/validate.js";
import * as specialtyController from "./specialty.controller.js";
import { CreateSpecialtyBody, ListSpecialtiesQuery, SpecialtyIdParams, UpdateSpecialtyBody } from "./specialty.schema.js";

const router = Router();
router.use(verifyUser);

router.get("/", requireRole(Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST, Role.ASSISTANT),
    validate({ query: ListSpecialtiesQuery }), specialtyController.listSpecialties);

router.post("/", requireRole(Role.ADMIN), validate({ body: CreateSpecialtyBody }), specialtyController.createSpecialty);
router.patch("/:specialtyId", requireRole(Role.ADMIN), validate({ params: SpecialtyIdParams, body: UpdateSpecialtyBody }), specialtyController.updateSpecialty);
router.delete("/:specialtyId", requireRole(Role.ADMIN), validate({ params: SpecialtyIdParams }), specialtyController.deleteSpecialty);

export default router;