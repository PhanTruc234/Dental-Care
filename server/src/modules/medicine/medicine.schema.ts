import { MedicineUnit } from "../../generated/prisma/enums.js";
import { envelope } from "../../shared/openapi/envelope.js";
import { z } from "../../shared/openapi/zod.js";
import { PaginationQuery, pagedEnvelope } from "../../shared/schemas/pagination.schema.js";

const money = z.number().nonnegative("Giá không được âm").max(9_999_999_999, "Giá vượt giới hạn");

export const MedicineIdParams = z.object({
    medicineId: z.string().uuid("medicineId không hợp lệ"),
}).openapi("MedicineIdParams");

export const CreateMedicineBody = z.object({
    name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(200),
    unit: z.nativeEnum(MedicineUnit).openapi({ example: "TABLET" }),
    manufacturerId: z.string().uuid("Nhà sản xuất không hợp lệ").optional(),
    sellingPrice: money.openapi({ example: 5000 }),
    minStock: z.number().int("minStock là số nguyên").min(0, "minStock >= 0").default(0),
}).openapi("CreateMedicineBody");

export const UpdateMedicineBody = z.object({
    name: z.string().trim().min(2).max(200).optional(),
    unit: z.nativeEnum(MedicineUnit).optional(),
    manufacturerId: z.string().uuid().nullish(),
    sellingPrice: money.optional(),
    minStock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, "Không có trường nào để cập nhật")
    .openapi("UpdateMedicineBody");

export const ListMedicinesQuery = PaginationQuery.extend({
    manufacturerId: z.string().uuid().optional(),
    unit: z.nativeEnum(MedicineUnit).optional(),
    isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    search: z.string().trim().min(1).max(100).optional(),
}).openapi("ListMedicinesQuery");

const MedicineItem = z.object({
    medicineId: z.string().uuid(),
    code: z.string().openapi({ example: "MED0001" }),
    name: z.string(),
    unit: z.nativeEnum(MedicineUnit),
    sellingPrice: z.number().openapi({ example: 5000 }),
    minStock: z.number(),
    isActive: z.boolean(),
    manufacturer: z.object({ manufacturerId: z.string().uuid(), name: z.string() }).nullable(),
}).openapi("MedicineItem");

export const MedicineListResponse = pagedEnvelope(MedicineItem, "MedicineListResponse");
export const MedicineResponse = envelope(MedicineItem, "MedicineResponse");

export type MedicineIdParams = z.infer<typeof MedicineIdParams>;
export type CreateMedicineBody = z.infer<typeof CreateMedicineBody>;
export type UpdateMedicineBody = z.infer<typeof UpdateMedicineBody>;
export type ListMedicinesQuery = z.infer<typeof ListMedicinesQuery>;