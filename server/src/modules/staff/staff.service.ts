import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/configs/prisma.js";
import { AuditAction, writeAudit } from "../../shared/services/audit.service.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/utils/AppError.js";
import { paginate, skipTake } from "../../shared/utils/paginate.js";
import { hashPassword } from "../../shared/utils/password.js";
import type { RequestContext } from "../../shared/utils/request-context.js";
import { withUniqueCodeRetry } from "../../shared/utils/unique-code.js";
import type {
    CreateStaffBody, ListStaffQuery, StaffIdParams, UpdateStaffBody,
} from "./staff.schema.js";
const nextEmployeeCode = async (tx: Prisma.TransactionClient) => {
    const last = await tx.staff.findFirst({
        orderBy: { employeeCode: "desc" },
        select: { employeeCode: true },
    });
    const lastNumber = last ? Number(last.employeeCode.replace(/\D/g, "")) : 0;
    return `NV${String(lastNumber + 1).padStart(6, "0")}`;
};

const assertSpecialtiesExist = async (tx: Prisma.TransactionClient, ids: string[]) => {
    const found = await tx.specialty.count({ where: { specialtyId: { in: ids } } });
    if (found !== ids.length) {
        throw new BadRequestError("Có chuyên khoa không tồn tại");
    }
};

const shape = (s: {
    staffId: string; userId: string; employeeCode: string; fullName: string;
    status: string; phone: string | null;
    user: { email: string; role: string; isActive: boolean };
    staffSpecialties: { specialty: { specialtyId: string; name: string } }[];
}) => ({
    staffId: s.staffId,
    userId: s.userId,
    employeeCode: s.employeeCode,
    fullName: s.fullName,
    email: s.user.email,
    role: s.user.role,
    status: s.status,
    phone: s.phone,
    isActive: s.user.isActive,
    specialties: s.staffSpecialties.map((x) => x.specialty),
});

const listSelect = {
    staffId: true, userId: true, employeeCode: true, fullName: true,
    status: true, phone: true,
    user: { select: { email: true, role: true, isActive: true } },
    staffSpecialties: { select: { specialty: { select: { specialtyId: true, name: true } } } },
} satisfies Prisma.StaffSelect;

export const createStaff = async (actorId: string, data: CreateStaffBody, context: RequestContext = {}) => {
    const { email, password, role, specialtyIds = [], ...profile } = data;
    const existing = await prisma.user.findUnique({ where: { email }, select: { userId: true } });
    if (existing) {
        throw new ConflictError("Email đã được sử dụng bởi một tài khoản khác");
    }

    const passwordHash = await hashPassword(password);

    const staff = await withUniqueCodeRetry("employee_code", "Không tạo được mã nhân viên, vui lòng thử lại", () => prisma.$transaction(async (tx) => {
        if (specialtyIds.length) {
            await assertSpecialtiesExist(tx, specialtyIds);
        }

        const user = await tx.user.create({
            data: {
                email,
                passwordHash,
                role,
                emailVerified: true,
            },
        });

        return tx.staff.create({
            data: {
                userId: user.userId,
                employeeCode: await nextEmployeeCode(tx),
                ...profile,
                staffSpecialties: specialtyIds.length
                    ? { create: specialtyIds.map((specialtyId) => ({ specialtyId })) }
                    : undefined,
            },
            select: listSelect,
        });
    }));
    await writeAudit({
        action: AuditAction.STAFF_CREATED,
        entity: "Staff",
        entityId: staff.staffId,
        userId: actorId,
        newValue: { employeeCode: staff.employeeCode, role, email },
        context,
    });

    return { message: "Tạo nhân viên thành công", staff: shape(staff) };
};

export const listStaff = async ({ page, limit, role, status, specialtyId, search }: ListStaffQuery) => {
    const where: Prisma.StaffWhereInput = {
        user: { deletedAt: null, ...(role ? { role } : {}) },
        ...(status ? { status } : {}),
        ...(specialtyId ? { staffSpecialties: { some: { specialtyId } } } : {}),
        ...(search
            ? {
                OR: [
                    { fullName: { contains: search, mode: "insensitive" } },
                    { employeeCode: { contains: search, mode: "insensitive" } },
                    { user: { email: { contains: search, mode: "insensitive" } } },
                ],
            }
            : {}),
    };

    const [rows, total] = await Promise.all([
        prisma.staff.findMany({
            where, ...skipTake(page, limit),
            orderBy: { employeeCode: "asc" },
            select: listSelect,
        }),
        prisma.staff.count({ where }),
    ]);

    return paginate(rows.map(shape), total, page, limit);
};

export const getStaff = async ({ staffId }: StaffIdParams) => {
    const s = await prisma.staff.findFirst({
        where: { staffId, user: { deletedAt: null } },
        select: {
            ...listSelect,
            gender: true, citizenId: true, dob: true, address: true,
            hireDate: true, terminatedAt: true, createdAt: true,
        },
    });
    if (!s) {
        throw new NotFoundError("Không tìm thấy nhân viên");
    }
    return {
        ...shape(s),
        gender: s.gender,
        citizenId: s.citizenId,
        dob: s.dob,
        address: s.address,
        hireDate: s.hireDate,
        terminatedAt: s.terminatedAt,
        createdAt: s.createdAt,
    };
};

export const updateStaff = async (actorId: string, { staffId }: StaffIdParams, data: UpdateStaffBody, context: RequestContext = {}) => {
    const { specialtyIds, ...profile } = data;

    const current = await prisma.staff.findFirst({
        where: { staffId, user: { deletedAt: null } },
        select: { staffId: true, status: true, fullName: true },
    });
    if (!current) {
        throw new NotFoundError("Không tìm thấy nhân viên");
    }

    const staff = await prisma.$transaction(async (tx) => {
        if (specialtyIds) {
            if (specialtyIds.length) {
                await assertSpecialtiesExist(tx, specialtyIds);
            }
            await tx.staffSpecialty.deleteMany({ where: { staffId } });
            if (specialtyIds.length) {
                await tx.staffSpecialty.createMany({
                    data: specialtyIds.map((specialtyId) => ({ staffId, specialtyId })),
                });
            }
        }
        return tx.staff.update({ where: { staffId }, data: profile, select: listSelect });
    });

    await writeAudit({
        action: AuditAction.STAFF_UPDATED,
        entity: "Staff",
        entityId: staffId,
        userId: actorId,
        oldValue: { status: current.status, fullName: current.fullName },
        newValue: { ...profile, ...(specialtyIds ? { specialtyIds } : {}) },
        context,
    });

    return { message: "Cập nhật nhân viên thành công", staff: shape(staff) };
};