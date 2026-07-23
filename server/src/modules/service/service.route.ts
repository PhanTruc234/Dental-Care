import { Router } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { verifyUser } from "../../shared/middlewares/auth.middleware.js";
import { requireRole } from "../../shared/middlewares/permission.middleware.js";
import { validate } from "../../shared/middlewares/validate.js";
import * as ctrl from "./service.controller.js";
import { CreateServiceBody, ListServicesQuery, ServiceIdParams, UpdateServiceBody } from "./service.schema.js";

const router = Router();
router.use(verifyUser);
const anyStaff = requireRole(Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST, Role.ASSISTANT);

router.get("/", anyStaff, validate({ query: ListServicesQuery }), ctrl.listServices);
router.get("/:serviceId", anyStaff, validate({ params: ServiceIdParams }), ctrl.getService);
router.post("/", requireRole(Role.ADMIN), validate({ body: CreateServiceBody }), ctrl.createService);
router.patch("/:serviceId", requireRole(Role.ADMIN),
    validate({ params: ServiceIdParams, body: UpdateServiceBody }), ctrl.updateService);

export default router;