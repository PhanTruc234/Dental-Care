import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../configs/prisma.js";
import { logger } from "../configs/logger.js";

/**
 * Danh sách hành động được ghi vết. Dùng hằng số thay vì chuỗi tự do
 * để không bị gõ sai âm thầm ("LOGOUT_ALL" vs "LOGOUTALL").
 *
 * Chỉ ghi hành động THAY ĐỔI TRẠNG THÁI hoặc CÓ Ý NGHĨA AN NINH.
 * Thao tác đọc và lỗi validate thuộc về pino, không thuộc về đây.
 */
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
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

type AuditInput = {
    action: AuditAction;
    entity: string;
    entityId?: string | null;
    /** null với hành động của khách chưa đăng nhập (vd đăng nhập sai email) */
    userId?: string | null;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    context?: { ip?: string | null; userAgent?: string | null };
};

/**
 * TUYỆT ĐỐI KHÔNG truyền mật khẩu, hash, token, session id hay mã xác thực
 * vào oldValue/newValue - kể cả đã hash. Bảng này giữ vĩnh viễn và ít được
 * soi phân quyền hơn các bảng nghiệp vụ.
 *
 * Ghi log không bao giờ được làm hỏng request chính: mọi lỗi ở đây chỉ
 * báo qua pino rồi đi tiếp.
 */
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
