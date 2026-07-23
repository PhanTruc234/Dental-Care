import { envelope } from "../../shared/openapi/envelope.js";
import { z } from "../../shared/openapi/zod.js";

export const ServiceCategoryIdParams = z.object({
    serviceCategoryId: z.string().uuid("serviceCategoryId không hợp lệ"),
}).openapi("ServiceCategoryIdParams");

export const CreateServiceCategoryBody = z.object({
    name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(100)
        .openapi({ example: "Chỉnh nha" }),
    description: z.string().trim().max(500).optional(),
}).openapi("CreateServiceCategoryBody");

export const UpdateServiceCategoryBody = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullish(),
}).refine((v) => Object.keys(v).length > 0, "Không có trường nào để cập nhật")
    .openapi("UpdateServiceCategoryBody");

export const ListServiceCategoriesQuery = z.object({
    search: z.string().trim().min(1).max(100).optional(),
}).openapi("ListServiceCategoriesQuery");

const ServiceCategoryItem = z.object({
    serviceCategoryId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    serviceCount: z.number().openapi({ example: 5 }),
}).openapi("ServiceCategoryItem");

export const ServiceCategoryListResponse = envelope(z.array(ServiceCategoryItem), "ServiceCategoryListResponse");
export const ServiceCategoryResponse = envelope(ServiceCategoryItem, "ServiceCategoryResponse");

export type ServiceCategoryIdParams = z.infer<typeof ServiceCategoryIdParams>;
export type CreateServiceCategoryBody = z.infer<typeof CreateServiceCategoryBody>;
export type UpdateServiceCategoryBody = z.infer<typeof UpdateServiceCategoryBody>;
export type ListServiceCategoriesQuery = z.infer<typeof ListServiceCategoriesQuery>;