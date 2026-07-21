import { Router } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { verifyUser } from "../../shared/middlewares/auth.middleware.js";
import { requireRole } from "../../shared/middlewares/permission.middleware.js";
import { validate } from "../../shared/middlewares/validate.js";
import * as userController from "./user.controller.js";
import {
    ListUsersQuery, UpdateUserRoleBody, UpdateUserStatusBody, UserIdParams,
} from "./user.schema.js";

const router = Router();
router.use(verifyUser, requireRole(Role.ADMIN));

router.get("/", validate({ query: ListUsersQuery }), userController.listUsers);
router.get("/:userId", validate({ params: UserIdParams }), userController.getUser);
router.patch("/:userId/status", validate({ params: UserIdParams, body: UpdateUserStatusBody }), userController.setUserStatus);
router.patch("/:userId/role", validate({ params: UserIdParams, body: UpdateUserRoleBody }), userController.setUserRole);

export default router;