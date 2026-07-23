import { registry } from "../../shared/openapi/registry.js";
import { ErrorResponse } from "../../shared/openapi/error.schema.js";
import { z } from "../../shared/openapi/zod.js";
import { MessageResponse } from "../auth/auth.schema.js";
import {
    CreateServiceCategoryBody, ListServiceCategoriesQuery, ServiceCategoryIdParams,
    ServiceCategoryListResponse, ServiceCategoryResponse, UpdateServiceCategoryBody,
} from "./service-category.schema.js";

const json = <T extends z.ZodTypeAny>(s: T) => ({ content: { "application/json": { schema: s } } });
const res = <T extends z.ZodTypeAny>(d: string, s: T) => ({ description: d, ...json(s) });
const err = (d: string) => ({ description: d, ...json(ErrorResponse) });
const secured = { security: [{ cookieAuth: [] }] };
const guarded = { 401: err("Chưa đăng nhập"), 403: err("Không đủ quyền") };

registry.registerPath({
    method: "get", path: "/api/v1/service-categories", tags: ["ServiceCategories"],
    summary: "Danh sách danh mục dịch vụ",
    description: "Không phân trang — dùng đổ dropdown. `search` lọc theo tên.",
    ...secured, request: { query: ListServiceCategoriesQuery },
    responses: { 200: res("OK", ServiceCategoryListResponse), ...guarded },
});
registry.registerPath({
    method: "post", path: "/api/v1/service-categories", tags: ["ServiceCategories"],
    summary: "Tạo danh mục (ADMIN)", ...secured,
    request: { body: json(CreateServiceCategoryBody) },
    responses: { 201: res("Đã tạo", ServiceCategoryResponse), 409: err("Tên đã tồn tại"), ...guarded },
});
registry.registerPath({
    method: "patch", path: "/api/v1/service-categories/{serviceCategoryId}", tags: ["ServiceCategories"],
    summary: "Cập nhật danh mục (ADMIN)", ...secured,
    request: { params: ServiceCategoryIdParams, body: json(UpdateServiceCategoryBody) },
    responses: { 200: res("Đã cập nhật", ServiceCategoryResponse), 409: err("Tên đã tồn tại"), ...guarded, 404: err("Không tìm thấy") },
});
registry.registerPath({
    method: "delete", path: "/api/v1/service-categories/{serviceCategoryId}", tags: ["ServiceCategories"],
    summary: "Xoá danh mục (ADMIN)",
    description: "Bị chặn nếu còn dịch vụ thuộc danh mục.",
    ...secured, request: { params: ServiceCategoryIdParams },
    responses: { 200: res("Đã xoá", MessageResponse), 400: err("Còn dịch vụ đang dùng"), ...guarded, 404: err("Không tìm thấy") },
});