import { envelope } from "../../shared/openapi/envelope.js";
import { z } from "../../shared/openapi/zod.js";
import { PaginationQuery, pagedEnvelope } from "../../shared/schemas/pagination.schema.js";
const money = z.number().nonnegative("Giá không được âm").max(9_999_999_999, "Giá vượt giới hạn");
const commission = z.number().min(0, "Hoa hồng >= 0").max(1, "Hoa hồng tối đa 1 (100%)");

export const ServiceIdParams = z.object({
    serviceId: z.string().uuid("serviceId không hợp lệ"),
}).openapi("ServiceIdParams");

export const CreateServiceBody = z.object({
    serviceCategoryId: z.string().uuid("Danh mục không hợp lệ"),
    name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(200),
    description: z.string().trim().max(1000).optional(),
    price: money.openapi({ example: 1500000 }),
    duration: z.number().int("Thời lượng là số nguyên").positive("Thời lượng phải > 0")
        .max(600, "Tối đa 600 phút").openapi({ example: 30 }),
    commissionRate: commission.default(0).openapi({ example: 0.05 }),
}).openapi("CreateServiceBody");

export const UpdateServiceBody = z.object({
    serviceCategoryId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(1000).nullish(),
    price: money.optional(),
    duration: z.number().int().positive().max(600).optional(),
    commissionRate: commission.optional(),
    isActive: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, "Không có trường nào để cập nhật")
    .openapi("UpdateServiceBody");

export const ListServicesQuery = PaginationQuery.extend({
    categoryId: z.string().uuid().optional(),
    isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    search: z.string().trim().min(1).max(100).optional(),
}).openapi("ListServicesQuery");

const ServiceItem = z.object({
    serviceId: z.string().uuid(),
    code: z.string().openapi({ example: "DV0001" }),
    name: z.string(),
    description: z.string().nullable(),
    price: z.number().openapi({ example: 1500000 }),
    duration: z.number().openapi({ example: 30 }),
    commissionRate: z.number().openapi({ example: 0.05 }),
    isActive: z.boolean(),
    category: z.object({ serviceCategoryId: z.string().uuid(), name: z.string() }),
}).openapi("ServiceItem");

export const ServiceListResponse = pagedEnvelope(ServiceItem, "ServiceListResponse");
export const ServiceResponse = envelope(ServiceItem, "ServiceResponse");

export type ServiceIdParams = z.infer<typeof ServiceIdParams>;
export type CreateServiceBody = z.infer<typeof CreateServiceBody>;
export type UpdateServiceBody = z.infer<typeof UpdateServiceBody>;
export type ListServicesQuery = z.infer<typeof ListServicesQuery>;