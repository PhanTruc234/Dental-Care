import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/configs/prisma.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/utils/AppError.js";
import { withUniqueCodeRetry } from "../../shared/utils/unique-code.js";
import type {
    CreateSpecialtyBody, ListSpecialtiesQuery, SpecialtyIdParams, UpdateSpecialtyBody,
} from "./specialty.schema.js";

const selectSpecialty = {
    specialtyId: true,
    code: true,
    name: true,
    _count: { select: { staffs: true } },
} satisfies Prisma.SpecialtySelect;

const shape = (s: {
    specialtyId: string; code: string; name: string; _count: { staffs: number };
}) => ({
    specialtyId: s.specialtyId,
    code: s.code,
    name: s.name,
    staffCount: s._count.staffs,
});
const nextSpecialtyCode = async (tx: Prisma.TransactionClient) => {
    const last = await tx.specialty.findFirst({
        orderBy: { code: "desc" },
        select: { code: true },
    });
    const lastNumber = last ? Number(last.code.replace(/\D/g, "")) : 0;
    return `SP${String(lastNumber + 1).padStart(3, "0")}`;
};
const assertNameUnique = async (
    client: Prisma.TransactionClient,
    name: string,
    excludeSpecialtyId?: string,
) => {
    const dup = await client.specialty.findFirst({
        where: {
            name: { equals: name.trim(), mode: "insensitive" },
            ...(excludeSpecialtyId ? { specialtyId: { not: excludeSpecialtyId } } : {}),
        },
        select: { specialtyId: true },
    });
    if (dup) {
        throw new ConflictError("Tên chuyên khoa đã tồn tại");
    }
};

export const listSpecialties = async ({ search }: ListSpecialtiesQuery) => {
    const rows = await prisma.specialty.findMany({
        where: search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { code: { contains: search, mode: "insensitive" } },
                ],
            }
            : undefined,
        orderBy: { name: "asc" },
        select: selectSpecialty,
    });
    return rows.map(shape);
};

export const createSpecialty = async ({ name }: CreateSpecialtyBody) => {
    return withUniqueCodeRetry("code", "Không tạo được mã chuyên khoa, vui lòng thử lại",
        async () => {
            const s = await prisma.$transaction(async (tx) => {
                await assertNameUnique(tx, name);
                const code = await nextSpecialtyCode(tx);
                return tx.specialty.create({ data: { code, name }, select: selectSpecialty });
            });
            return { message: "Tạo chuyên khoa thành công", specialty: shape(s) };
        },
    );
};

export const updateSpecialty = async (
    { specialtyId }: SpecialtyIdParams,
    { name }: UpdateSpecialtyBody,
) => {
    const current = await prisma.specialty.findUnique({
        where: { specialtyId },
        select: { specialtyId: true },
    });
    if (!current) {
        throw new NotFoundError("Không tìm thấy chuyên khoa");
    }

    await assertNameUnique(prisma, name, specialtyId);
    const s = await prisma.specialty.update({
        where: { specialtyId },
        data: { name },
        select: selectSpecialty,
    });
    return { message: "Cập nhật chuyên khoa thành công", specialty: shape(s) };
};

export const deleteSpecialty = async ({ specialtyId }: SpecialtyIdParams) => {
    const s = await prisma.specialty.findUnique({
        where: { specialtyId },
        select: { specialtyId: true, _count: { select: { staffs: true } } },
    });
    if (!s) {
        throw new NotFoundError("Không tìm thấy chuyên khoa");
    }
    if (s._count.staffs > 0) {
        throw new BadRequestError(
            `Còn ${s._count.staffs} nhân viên đang gắn chuyên khoa này, không thể xoá`,
        );
    }

    await prisma.specialty.delete({ where: { specialtyId } });
    return { message: "Đã xoá chuyên khoa" };
};
