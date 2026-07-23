import { registry } from "../../shared/openapi/registry.js";
import { ErrorResponse } from "../../shared/openapi/error.schema.js";
import { z } from "../../shared/openapi/zod.js";
import { MessageResponse } from "../auth/auth.schema.js";
import {
    CreateManufacturerBody, ListManufacturersQuery, ManufacturerIdParams,
    ManufacturerListResponse, ManufacturerResponse, UpdateManufacturerBody,
} from "./manufacturer.schema.js";

const json = <T extends z.ZodTypeAny>(s: T) => ({ content: { "application/json": { schema: s } } });
const res = <T extends z.ZodTypeAny>(d: string, s: T) => ({ description: d, ...json(s) });
const err = (d: string) => ({ description: d, ...json(ErrorResponse) });
const secured = { security: [{ cookieAuth: [] }] };
const guarded = { 401: err("Chưa đăng nhập"), 403: err("Không đủ quyền") };

registry.registerPath({
    method: "get", path: "/api/v1/manufacturers", tags: ["Manufacturers"],
    summary: "Danh sách nhà sản xuất",
    description: "Không phân trang — dropdown. `search` theo tên; `isActive` lọc trạng thái.",
    ...secured, request: { query: ListManufacturersQuery },
    responses: { 200: res("OK", ManufacturerListResponse), ...guarded },
});
registry.registerPath({
    method: "post", path: "/api/v1/manufacturers", tags: ["Manufacturers"],
    summary: "Tạo nhà sản xuất (ADMIN)", ...secured,
    request: { body: json(CreateManufacturerBody) },
    responses: { 201: res("Đã tạo", ManufacturerResponse), 409: err("Tên đã tồn tại"), ...guarded },
});
registry.registerPath({
    method: "patch", path: "/api/v1/manufacturers/{manufacturerId}", tags: ["Manufacturers"],
    summary: "Cập nhật / bật-tắt (ADMIN)", ...secured,
    request: { params: ManufacturerIdParams, body: json(UpdateManufacturerBody) },
    responses: { 200: res("Đã cập nhật", ManufacturerResponse), 409: err("Tên đã tồn tại"), ...guarded, 404: err("Không tìm thấy") },
});
registry.registerPath({
    method: "delete", path: "/api/v1/manufacturers/{manufacturerId}", tags: ["Manufacturers"],
    summary: "Xoá nhà sản xuất (ADMIN)",
    description: "Bị chặn nếu còn thuốc tham chiếu — dùng isActive=false thay thế.",
    ...secured, request: { params: ManufacturerIdParams },
    responses: { 200: res("Đã xoá", MessageResponse), 400: err("Còn thuốc đang dùng"), ...guarded, 404: err("Không tìm thấy") },
});