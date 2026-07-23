import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../shared/configs/prisma.js";
import { AuditAction, writeAudit } from "../../shared/services/audit.service.js";
import { BadRequestError, NotFoundError } from "../../shared/utils/AppError.js";
import { paginate, skipTake } from "../../shared/utils/paginate.js";
import type { RequestContext } from "../../shared/utils/request-context.js";
import { withUniqueCodeRetry } from "../../shared/utils/unique-code.js";
import type {
    CreateMedicineBody, ListMedicinesQuery, MedicineIdParams, UpdateMedicineBody,
} from "./medicine.schema.js";

const MEDICINE_CODE_PREFIX = "MED";
const MEDICINE_CODE_DIGITS = 4;

const select = {
    medicineId: true, code: true, name: true, unit: true,
    sellingPrice: true, minStock: true, isActive: true,
    manufacturer: { select: { manufacturerId: true, name: true } },
} satisfies Prisma.MedicineSelect;

const shape = (m: {
    medicineId: string; code: string; name: string; unit: string;
    sellingPrice: Prisma.Decimal; minStock: number; isActive: boolean;
    manufacturer: { manufacturerId: string; name: string } | null;
}) => ({
    medicineId: m.medicineId,
    code: m.code,
    name: m.name,
    unit: m.unit,
    sellingPrice: Number(m.sellingPrice),
    minStock: m.minStock,
    isActive: m.isActive,
    manufacturer: m.manufacturer,
});

const nextMedicineCode = async (tx: Prisma.TransactionClient) => {
    const last = await tx.medicine.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
    const n = last ? Number(last.code.replace(/\D/g, "")) : 0;
    return `${MEDICINE_CODE_PREFIX}${String(n + 1).padStart(MEDICINE_CODE_DIGITS, "0")}`;
};

const assertManufacturerExists = async (
    client: Prisma.TransactionClient, manufacturerId: string,
) => {
    const c = await client.manufacturer.count({ where: { manufacturerId } });
    if (!c) throw new BadRequestError("Nhà sản xuất không tồn tại");
};

export const createMedicine = async (
    actorId: string, data: CreateMedicineBody, context: RequestContext = {},
) => {
    const medicine = await withUniqueCodeRetry(
        "code", "Không tạo được mã thuốc, vui lòng thử lại",
        () => prisma.$transaction(async (tx) => {
            if (data.manufacturerId) await assertManufacturerExists(tx, data.manufacturerId);
            const code = await nextMedicineCode(tx);
            return tx.medicine.create({ data: { ...data, code }, select });
        }),
    );

    await writeAudit({
        action: AuditAction.MEDICINE_CREATED, entity: "Medicine",
        entityId: medicine.medicineId, userId: actorId,
        newValue: { code: medicine.code, sellingPrice: medicine.sellingPrice.toString() },
        context,
    });
    return { message: "Tạo thuốc thành công", medicine: shape(medicine) };
};

export const listMedicines = async (
    { page, limit, manufacturerId, unit, isActive, search }: ListMedicinesQuery,
) => {
    const where: Prisma.MedicineWhereInput = {
        ...(manufacturerId ? { manufacturerId } : {}),
        ...(unit ? { unit } : {}),
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
        prisma.medicine.findMany({ where, ...skipTake(page, limit), orderBy: { code: "asc" }, select }),
        prisma.medicine.count({ where }),
    ]);
    return paginate(rows.map(shape), total, page, limit);
};

export const getMedicine = async ({ medicineId }: MedicineIdParams) => {
    const m = await prisma.medicine.findUnique({ where: { medicineId }, select });
    if (!m) throw new NotFoundError("Không tìm thấy thuốc");
    return shape(m);
};

export const updateMedicine = async (
    actorId: string, { medicineId }: MedicineIdParams, data: UpdateMedicineBody, context: RequestContext = {},
) => {
    const current = await prisma.medicine.findUnique({
        where: { medicineId }, select: { medicineId: true, sellingPrice: true, isActive: true },
    });
    if (!current) throw new NotFoundError("Không tìm thấy thuốc");

    if (data.manufacturerId) await assertManufacturerExists(prisma, data.manufacturerId);

    const medicine = await prisma.medicine.update({ where: { medicineId }, data, select });

    await writeAudit({
        action: AuditAction.MEDICINE_UPDATED, entity: "Medicine",
        entityId: medicineId, userId: actorId,
        oldValue: { sellingPrice: current.sellingPrice.toString(), isActive: current.isActive },
        newValue: {
            ...(data.sellingPrice !== undefined ? { sellingPrice: String(data.sellingPrice) } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
        context,
    });
    return { message: "Cập nhật thuốc thành công", medicine: shape(medicine) };
};