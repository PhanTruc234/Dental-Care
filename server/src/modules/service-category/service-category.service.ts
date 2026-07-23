import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/configs/prisma.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/utils/AppError.js";
import type {
    CreateServiceCategoryBody, ListServiceCategoriesQuery,
    ServiceCategoryIdParams, UpdateServiceCategoryBody,
} from "./service-category.schema.js";

const select = {
    serviceCategoryId: true,
    name: true,
    description: true,
    _count: { select: { services: true } },
} satisfies Prisma.ServiceCategorySelect;

const shape = (c: {
    serviceCategoryId: string; name: string; description: string | null;
    _count: { services: number };
}) => ({
    serviceCategoryId: c.serviceCategoryId,
    name: c.name,
    description: c.description,
    serviceCount: c._count.services,
});

export const listServiceCategories = async ({ search }: ListServiceCategoriesQuery) => {
    const rows = await prisma.serviceCategory.findMany({
        where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
        orderBy: { name: "asc" },
        select,
    });
    return rows.map(shape);
};

export const createServiceCategory = async ({ name, description }: CreateServiceCategoryBody) => {
    const existing = await prisma.serviceCategory.findFirst({
        where: { name: { equals: name.trim(), mode: "insensitive" } }, select: { serviceCategoryId: true },
    });
    if (existing) {
        throw new ConflictError("Tên danh mục đã tồn tại");
    }

    const c = await prisma.serviceCategory.create({ data: { name, description }, select });
    return { message: "Tạo danh mục thành công", category: shape(c) };
};

export const updateServiceCategory = async ({ serviceCategoryId }: ServiceCategoryIdParams, { name, description }: UpdateServiceCategoryBody,) => {
    const current = await prisma.serviceCategory.findUnique({
        where: { serviceCategoryId }, select: { serviceCategoryId: true },
    });
    if (!current) {
        throw new NotFoundError("Không tìm thấy danh mục");
    }

    if (name) {
        const dup = await prisma.serviceCategory.findFirst({
            where: { name: { equals: name.trim(), mode: "insensitive" }, serviceCategoryId: { not: serviceCategoryId } },
            select: { serviceCategoryId: true },
        });
        if (dup) {
            throw new ConflictError("Tên danh mục đã tồn tại");
        }
    }

    const c = await prisma.serviceCategory.update({
        where: { serviceCategoryId },
        data: { ...(name ? { name } : {}), ...(description !== undefined ? { description } : {}) },
        select,
    });
    return { message: "Cập nhật danh mục thành công", category: shape(c) };
};

export const deleteServiceCategory = async ({ serviceCategoryId }: ServiceCategoryIdParams) => {
    const c = await prisma.serviceCategory.findUnique({
        where: { serviceCategoryId },
        select: { serviceCategoryId: true, _count: { select: { services: true } } },
    });
    if (!c) {
        throw new NotFoundError("Không tìm thấy danh mục");
    }
    if (c._count.services > 0) {
        throw new BadRequestError(`Có ${c._count.services} dịch vụ thuộc danh mục này, không thể xoá`,);
    }
    await prisma.serviceCategory.delete({ where: { serviceCategoryId } });
    return { message: "Đã xoá danh mục" };
};