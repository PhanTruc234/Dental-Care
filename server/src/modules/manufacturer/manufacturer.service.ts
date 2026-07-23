import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/configs/prisma.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/utils/AppError.js";
import type {
    CreateManufacturerBody, ListManufacturersQuery,
    ManufacturerIdParams, UpdateManufacturerBody,
} from "./manufacturer.schema.js";

const select = {
    manufacturerId: true, name: true, country: true, isActive: true,
    _count: { select: { medicines: true } },
} satisfies Prisma.ManufacturerSelect;

const shape = (m: {
    manufacturerId: string; name: string; country: string | null; isActive: boolean;
    _count: { medicines: number };
}) => ({
    manufacturerId: m.manufacturerId,
    name: m.name,
    country: m.country,
    isActive: m.isActive,
    medicineCount: m._count.medicines,
});

export const listManufacturers = async ({ search, isActive }: ListManufacturersQuery) => {
    const rows = await prisma.manufacturer.findMany({
        where: {
            ...(isActive === undefined ? {} : { isActive }),
            ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        },
        orderBy: { name: "asc" },
        select,
    });
    return rows.map(shape);
};

export const createManufacturer = async ({ name, country }: CreateManufacturerBody) => {
    const existing = await prisma.manufacturer.findFirst({ where: { name: { equals: name.trim(), mode: "insensitive" } }, select: { manufacturerId: true } });
    if (existing) {
        throw new ConflictError("Nhà sản xuất đã tồn tại");
    }

    const m = await prisma.manufacturer.create({ data: { name, country }, select });
    return { message: "Tạo nhà sản xuất thành công", manufacturer: shape(m) };
};

export const updateManufacturer = async (
    { manufacturerId }: ManufacturerIdParams,
    { name, country, isActive }: UpdateManufacturerBody,
) => {
    const current = await prisma.manufacturer.findUnique({
        where: { manufacturerId }, select: { manufacturerId: true },
    });
    if (!current) {
        throw new NotFoundError("Không tìm thấy nhà sản xuất");
    }

    if (name) {
        const dup = await prisma.manufacturer.findFirst({
            where: { name: { equals: name.trim(), mode: "insensitive" }, manufacturerId: { not: manufacturerId } },
            select: { manufacturerId: true },
        });
        if (dup) {
            throw new ConflictError("Tên nhà sản xuất đã tồn tại");
        }
    }

    const m = await prisma.manufacturer.update({
        where: { manufacturerId },
        data: {
            ...(name ? { name } : {}),
            ...(country !== undefined ? { country } : {}),
            ...(isActive !== undefined ? { isActive } : {}),
        },
        select,
    });
    return { message: "Cập nhật nhà sản xuất thành công", manufacturer: shape(m) };
};

export const deleteManufacturer = async ({ manufacturerId }: ManufacturerIdParams) => {
    const m = await prisma.manufacturer.findUnique({
        where: { manufacturerId },
        select: { manufacturerId: true, _count: { select: { medicines: true } } },
    });
    if (!m) {
        throw new NotFoundError("Không tìm thấy nhà sản xuất");
    }
    if (m._count.medicines > 0) {
        throw new BadRequestError(
            `Còn ${m._count.medicines} thuốc thuộc nhà sản xuất này. Hãy đặt isActive=false thay vì xoá.`,
        );
    }
    await prisma.manufacturer.delete({ where: { manufacturerId } });
    return { message: "Đã xoá nhà sản xuất" };
};