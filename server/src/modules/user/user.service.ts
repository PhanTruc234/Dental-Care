import { Prisma } from "../../generated/prisma/client.js";
import { Role } from "../../generated/prisma/enums.js";
import { prisma } from "../../shared/configs/prisma.js";
import { AuditAction, writeAudit } from "../../shared/services/audit.service.js";
import { BadRequestError, NotFoundError } from "../../shared/utils/AppError.js";
import { paginate, skipTake } from "../../shared/utils/paginate.js";
import type { RequestContext } from "../../shared/utils/request-context.js";
import type {
    ListUsersQuery, UpdateUserRoleBody, UpdateUserStatusBody, UserIdParams,
} from "./user.schema.js";

export const listUsers = async ({ page, limit, role, isActive, search }: ListUsersQuery) => {
    const where: Prisma.UserWhereInput = {
        deletedAt: null,
        ...(role ? { role } : {}),
        ...(isActive === undefined ? {} : { isActive }),
        ...(search
            ? {
                OR: [
                    { email: { contains: search, mode: "insensitive" } },
                    { staff: { fullName: { contains: search, mode: "insensitive" } } },
                    { patient: { fullName: { contains: search, mode: "insensitive" } } },
                ],
            }
            : {}),
    };

    const [rows, total] = await Promise.all([
        prisma.user.findMany({
            where,
            ...skipTake(page, limit),
            orderBy: { createdAt: "desc" },
            select: {
                userId: true, email: true, role: true, isActive: true,
                emailVerified: true, createdAt: true,
                staff: { select: { fullName: true } },
                patient: { select: { fullName: true } },
            },
        }),
        prisma.user.count({ where }),
    ]);

    const items = rows.map((u) => ({
        id: u.userId,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        emailVerified: u.emailVerified,
        fullName: u.staff?.fullName ?? u.patient?.fullName ?? null,
        createdAt: u.createdAt,
    }));

    return paginate(items, total, page, limit);
};

export const getUser = async ({ userId }: UserIdParams) => {
    const u = await prisma.user.findFirst({
        where: { userId, deletedAt: null },
        select: {
            userId: true, email: true, role: true, isActive: true, emailVerified: true,
            authProvider: true, createdAt: true, updatedAt: true,
            staff: { select: { staffId: true, employeeCode: true, status: true, fullName: true } },
            patient: { select: { patientId: true, patientCode: true, fullName: true } },
        },
    });
    if (!u) {
        throw new NotFoundError("Không tìm thấy tài khoản");
    }

    return {
        id: u.userId,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        emailVerified: u.emailVerified,
        authProvider: u.authProvider,
        fullName: u.staff?.fullName ?? u.patient?.fullName ?? null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        staff: u.staff
            ? { staffId: u.staff.staffId, employeeCode: u.staff.employeeCode, status: u.staff.status }
            : null,
        patient: u.patient
            ? { patientId: u.patient.patientId, patientCode: u.patient.patientCode }
            : null,
    };
};

export const setUserStatus = async (actorId: string, { userId }: UserIdParams, { isActive }: UpdateUserStatusBody, context: RequestContext = {}) => {
    if (actorId === userId && !isActive) {
        throw new BadRequestError("Không thể tự khoá tài khoản của chính mình");
    }

    const user = await prisma.user.findFirst({
        where: { userId, deletedAt: null },
        select: { userId: true, isActive: true },
    });
    if (!user) {
        throw new NotFoundError("Không tìm thấy tài khoản");
    }
    if (user.isActive === isActive) {
        return { message: isActive ? "Tài khoản vốn đang hoạt động" : "Tài khoản vốn đã bị khoá" };
    }

    await prisma.$transaction([
        prisma.user.update({ where: { userId }, data: { isActive } }),
        ...(isActive
            ? []
            : [prisma.refreshToken.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: new Date() },
            })]),
    ]);

    await writeAudit({
        action: isActive ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
        entity: "User",
        entityId: userId,
        userId: actorId,
        oldValue: { isActive: user.isActive },
        newValue: { isActive },
        context,
    });

    return { message: isActive ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản" };
};

export const setUserRole = async (actorId: string, { userId }: UserIdParams, { role }: UpdateUserRoleBody, context: RequestContext = {}) => {
    if (actorId === userId) {
        throw new BadRequestError("Không thể tự đổi vai trò của chính mình");
    }

    const user = await prisma.user.findFirst({
        where: { userId, deletedAt: null },
        select: { userId: true, role: true, staff: { select: { staffId: true } } },
    });
    if (!user) {
        throw new NotFoundError("Không tìm thấy tài khoản");
    }
    if (user.role === role) {
        return { message: "Vai trò không thay đổi" };
    }
    if (role !== Role.PATIENT && !user.staff) {
        throw new BadRequestError(
            "Tài khoản chưa có hồ sơ nhân viên. Hãy tạo nhân viên qua POST /staff trước.",
        );
    }
    if (role === Role.PATIENT && user.staff) {
        throw new BadRequestError(
            "Tài khoản đang có hồ sơ nhân viên. Hãy đổi trạng thái nhân viên thay vì hạ vai trò.",
        );
    }

    await prisma.user.update({ where: { userId }, data: { role } });

    await writeAudit({
        action: AuditAction.USER_ROLE_CHANGED,
        entity: "User",
        entityId: userId,
        userId: actorId,
        oldValue: { role: user.role },
        newValue: { role },
        context,
    });

    return { message: "Đã đổi vai trò" };
};