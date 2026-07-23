import { Router } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { verifyUser } from "../../shared/middlewares/auth.middleware.js";
import { requireRole } from "../../shared/middlewares/permission.middleware.js";
import { validate } from "../../shared/middlewares/validate.js";
import * as ctrl from "./manufacturer.controller.js";
import {
    CreateManufacturerBody, ListManufacturersQuery,
    ManufacturerIdParams, UpdateManufacturerBody,
} from "./manufacturer.schema.js";

const router = Router();
router.use(verifyUser);
const anyStaff = requireRole(Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST, Role.ASSISTANT);

router.get("/", anyStaff, validate({ query: ListManufacturersQuery }), ctrl.listManufacturers);
router.post("/", requireRole(Role.ADMIN), validate({ body: CreateManufacturerBody }), ctrl.createManufacturer);
router.patch("/:manufacturerId", requireRole(Role.ADMIN),
    validate({ params: ManufacturerIdParams, body: UpdateManufacturerBody }), ctrl.updateManufacturer);
router.delete("/:manufacturerId", requireRole(Role.ADMIN),
    validate({ params: ManufacturerIdParams }), ctrl.deleteManufacturer);

export default router;