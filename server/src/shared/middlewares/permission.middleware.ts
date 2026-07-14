import { NextFunction, Request, Response } from "express"
import { ForbiddenError } from "../utils/AppError.js";
import { Role } from "../types/auth.types.js";

export const requireRole = (...allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            throw new ForbiddenError(
                "Bạn không có quyền thực hiện hành động này"
            );
        }
        next();
    }
}