import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../configs/prisma.js";
import { logger } from "../configs/logger.js";
export const AuditAction = {
    REGISTER: "REGISTER",
    LOGIN: "LOGIN",
    LOGIN_FAILED: "LOGIN_FAILED",
    LOGOUT: "LOGOUT",
    LOGOUT_ALL: "LOGOUT_ALL",
    SESSION_REVOKED: "SESSION_REVOKED",
    PASSWORD_CHANGED: "PASSWORD_CHANGED",
    PASSWORD_RESET: "PASSWORD_RESET",
    TOKEN_REUSE_DETECTED: "TOKEN_REUSE_DETECTED",
    USER_ACTIVATED: "USER_ACTIVATED",
    USER_DEACTIVATED: "USER_DEACTIVATED",
    USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
    STAFF_CREATED: "STAFF_CREATED",
    STAFF_UPDATED: "STAFF_UPDATED",
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

type AuditInput = {
    action: AuditAction;
    entity: string;
    entityId?: string | null;
    userId?: string | null;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    context?: { ip?: string | null; userAgent?: string | null };
};
export const writeAudit = async ({
    action,
    entity,
    entityId,
    userId,
    oldValue,
    newValue,
    context,
}: AuditInput) => {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId: entityId ?? null,
                userId: userId ?? null,
                oldValue,
                newValue,
                ip: context?.ip ?? null,
                userAgent: context?.userAgent ?? null,
            },
        });
    } catch (err) {
        logger.error({ err, action, entity, entityId }, "Ghi audit log thất bại");
    }
};
