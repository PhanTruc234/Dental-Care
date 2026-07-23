import { envelope } from "../../shared/openapi/envelope.js";
import { z } from "../../shared/openapi/zod.js";

export const ManufacturerIdParams = z.object({
    manufacturerId: z.string().uuid("manufacturerId không hợp lệ"),
}).openapi("ManufacturerIdParams");

export const CreateManufacturerBody = z.object({
    name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(200).openapi({ example: "DHG Pharma" }),
    country: z.string().trim().max(100).optional().openapi({ example: "Việt Nam" }),
}).openapi("CreateManufacturerBody");

export const UpdateManufacturerBody = z.object({
    name: z.string().trim().min(2).max(200).optional(),
    country: z.string().trim().max(100).nullish(),
    isActive: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, "Không có trường nào để cập nhật")
    .openapi("UpdateManufacturerBody");

export const ListManufacturersQuery = z.object({
    search: z.string().trim().min(1).max(100).optional(),
    isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
}).openapi("ListManufacturersQuery");

const ManufacturerItem = z.object({
    manufacturerId: z.string().uuid(),
    name: z.string(),
    country: z.string().nullable(),
    isActive: z.boolean(),
    medicineCount: z.number().openapi({ example: 12 }),
}).openapi("ManufacturerItem");

export const ManufacturerListResponse = envelope(z.array(ManufacturerItem), "ManufacturerListResponse");
export const ManufacturerResponse = envelope(ManufacturerItem, "ManufacturerResponse");

export type ManufacturerIdParams = z.infer<typeof ManufacturerIdParams>;
export type CreateManufacturerBody = z.infer<typeof CreateManufacturerBody>;
export type UpdateManufacturerBody = z.infer<typeof UpdateManufacturerBody>;
export type ListManufacturersQuery = z.infer<typeof ListManufacturersQuery>;