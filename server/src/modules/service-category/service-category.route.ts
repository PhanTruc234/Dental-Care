import { Router } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { verifyUser } from "../../shared/middlewares/auth.middleware.js";
import { requireRole } from "../../shared/middlewares/permission.middleware.js";
import { validate } from "../../shared/middlewares/validate.js";
import * as ctrl from "./service-category.controller.js";
import {
    CreateServiceCategoryBody, ListServiceCategoriesQuery,
    ServiceCategoryIdParams, UpdateServiceCategoryBody,
} from "./service-category.schema.js";

const router = Router();
router.use(verifyUser);
const anyStaff = requireRole(Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST, Role.ASSISTANT);

router.get("/", anyStaff, validate({ query: ListServiceCategoriesQuery }), ctrl.listServiceCategories);
router.post("/", requireRole(Role.ADMIN), validate({ body: CreateServiceCategoryBody }), ctrl.createServiceCategory);
router.patch("/:serviceCategoryId", requireRole(Role.ADMIN),
    validate({ params: ServiceCategoryIdParams, body: UpdateServiceCategoryBody }), ctrl.updateServiceCategory);
router.delete("/:serviceCategoryId", requireRole(Role.ADMIN),
    validate({ params: ServiceCategoryIdParams }), ctrl.deleteServiceCategory);

export default router;