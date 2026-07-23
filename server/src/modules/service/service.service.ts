import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/configs/prisma.js";
import { AuditAction, writeAudit } from "../../shared/services/audit.service.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/utils/AppError.js";
import { paginate, skipTake } from "../../shared/utils/paginate.js";
import type { RequestContext } from "../../shared/utils/request-context.js";
import { withUniqueCodeRetry } from "../../shared/utils/unique-code.js";
import type {
    CreateServiceBody, ListServicesQuery, ServiceIdParams, UpdateServiceBody,
} from "./service.schema.js";

const SERVICE_CODE_PREFIX = "DV";
const SERVICE_CODE_DIGITS = 4;

const select = {
    serviceId: true, code: true, name: true, description: true,
    price: true, duration: true, commissionRate: true, isActive: true,
    category: { select: { serviceCategoryId: true, name: true } },
} satisfies Prisma.ServiceSelect;

const shape = (s: {
    serviceId: string; code: string; name: string; description: string | null;
    price: Prisma.Decimal; duration: number; commissionRate: Prisma.Decimal; isActive: boolean;
    category: { serviceCategoryId: string; name: string };
}) => ({
    serviceId: s.serviceId,
    code: s.code,
    name: s.name,
    description: s.description,
    price: Number(s.price),
    duration: s.duration,
    commissionRate: Number(s.commissionRate),
    isActive: s.isActive,
    category: s.category,
});

const nextServiceCode = async (tx: Prisma.TransactionClient) => {
    const last = await tx.service.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
    const n = last ? Number(last.code.replace(/\D/g, "")) : 0;
    return `${SERVICE_CODE_PREFIX}${String(n + 1).padStart(SERVICE_CODE_DIGITS, "0")}`;
};

const assertCategoryExists = async (tx: Prisma.TransactionClient, categoryId: string) => {
    const c = await tx.serviceCategory.count({ where: { serviceCategoryId: categoryId } });
    if (!c) {
        throw new BadRequestError("Danh mục dịch vụ không tồn tại");
    }
};
const assertNameUniqueInCategory = async (
    tx: Prisma.TransactionClient,
    name: string,
    serviceCategoryId: string,
    excludeServiceId?: string,
) => {
    const dup = await tx.service.findFirst({
        where: {
            name: { equals: name.trim(), mode: "insensitive" },
            serviceCategoryId,
            ...(excludeServiceId ? { serviceId: { not: excludeServiceId } } : {}),
        },
        select: { serviceId: true },
    });
    if (dup) {
        throw new ConflictError("Dịch vụ trùng tên đã tồn tại trong danh mục này");
    }
};

export const createService = async (
    actorId: string, data: CreateServiceBody, context: RequestContext = {},
) => {
    const service = await withUniqueCodeRetry(
        "code", "Không tạo được mã dịch vụ, vui lòng thử lại",
        () => prisma.$transaction(async (tx) => {
            await assertCategoryExists(tx, data.serviceCategoryId);
            await assertNameUniqueInCategory(tx, data.name, data.serviceCategoryId);
            const code = await nextServiceCode(tx);
            return tx.service.create({ data: { ...data, code }, select });
        }),
    );

    await writeAudit({
        action: AuditAction.SERVICE_CREATED, entity: "Service",
        entityId: service.serviceId, userId: actorId,
        newValue: { code: service.code, price: service.price.toString(), commissionRate: service.commissionRate.toString() },
        context,
    });
    return { message: "Tạo dịch vụ thành công", service: shape(service) };
};

export const listServices = async ({ page, limit, categoryId, isActive, search }: ListServicesQuery,) => {
    const where: Prisma.ServiceWhereInput = {
        ...(categoryId ? { serviceCategoryId: categoryId } : {}),
        ...(isActive === undefined ? {} : { isActive }),
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { code: { contains: search, mode: "insensitive" } },
                ],
            }
            : {}),
    };

    const [rows, total] = await Promise.all([
        prisma.service.findMany({ where, ...skipTake(page, limit), orderBy: { code: "asc" }, select }),
        prisma.service.count({ where }),
    ]);
    return paginate(rows.map(shape), total, page, limit);
};

export const getService = async ({ serviceId }: ServiceIdParams) => {
    const s = await prisma.service.findUnique({ where: { serviceId }, select });
    if (!s) {
        throw new NotFoundError("Không tìm thấy dịch vụ");
    }
    return shape(s);
};

export const updateService = async (actorId: string, { serviceId }: ServiceIdParams, data: UpdateServiceBody, context: RequestContext = {},) => {
    const current = await prisma.service.findUnique({
        where: { serviceId },
        select: {
            serviceId: true, name: true, serviceCategoryId: true,
            price: true, commissionRate: true, isActive: true,
        },
    });
    if (!current) {
        throw new NotFoundError("Không tìm thấy dịch vụ");
    }

    if (data.serviceCategoryId) {
        await assertCategoryExists(prisma, data.serviceCategoryId);
    }

    // Đổi tên hoặc đổi danh mục thì kiểm lại trùng tên - dùng giá trị hiệu lực
    // (giá trị mới nếu có trong body, ngược lại giữ giá trị hiện tại).
    if (data.name !== undefined || data.serviceCategoryId !== undefined) {
        await assertNameUniqueInCategory(
            prisma,
            data.name ?? current.name,
            data.serviceCategoryId ?? current.serviceCategoryId,
            serviceId,
        );
    }

    const service = await prisma.service.update({ where: { serviceId }, data, select });

    await writeAudit({
        action: AuditAction.SERVICE_UPDATED, entity: "Service",
        entityId: serviceId, userId: actorId,
        oldValue: {
            price: current.price.toString(),
            commissionRate: current.commissionRate.toString(),
            isActive: current.isActive,
        },
        newValue: {
            ...(data.price !== undefined ? { price: String(data.price) } : {}),
            ...(data.commissionRate !== undefined ? { commissionRate: String(data.commissionRate) } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
        context,
    });
    return { message: "Cập nhật dịch vụ thành công", service: shape(service) };
};