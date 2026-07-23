import { registry } from "../../shared/openapi/registry.js";
import { ErrorResponse } from "../../shared/openapi/error.schema.js";
import { z } from "../../shared/openapi/zod.js";
import {
    CreateServiceBody, ListServicesQuery, ServiceIdParams,
    ServiceListResponse, ServiceResponse, UpdateServiceBody,
} from "./service.schema.js";

const json = <T extends z.ZodTypeAny>(s: T) => ({ content: { "application/json": { schema: s } } });
const res = <T extends z.ZodTypeAny>(d: string, s: T) => ({ description: d, ...json(s) });
const err = (d: string) => ({ description: d, ...json(ErrorResponse) });
const secured = { security: [{ cookieAuth: [] }] };
const guarded = { 401: err("Chưa đăng nhập"), 403: err("Không đủ quyền") };

registry.registerPath({
    method: "get", path: "/api/v1/services", tags: ["Services"],
    summary: "Danh sách dịch vụ",
    description: "Phân trang. Lọc `categoryId`, `isActive`; tìm theo tên hoặc mã.",
    ...secured, request: { query: ListServicesQuery },
    responses: { 200: res("OK", ServiceListResponse), ...guarded },
});
registry.registerPath({
    method: "get", path: "/api/v1/services/{serviceId}", tags: ["Services"],
    summary: "Chi tiết dịch vụ", ...secured, request: { params: ServiceIdParams },
    responses: { 200: res("OK", ServiceResponse), ...guarded, 404: err("Không tìm thấy") },
});
registry.registerPath({
    method: "post", path: "/api/v1/services", tags: ["Services"],
    summary: "Tạo dịch vụ (ADMIN)",
    description: "Mã `DVxxxx` sinh tự động. `price`, `commissionRate` là giá niêm yết hiện tại.",
    ...secured, request: { body: json(CreateServiceBody) },
    responses: { 201: res("Đã tạo", ServiceResponse), 400: err("Danh mục không tồn tại"), ...guarded },
});
registry.registerPath({
    method: "patch", path: "/api/v1/services/{serviceId}", tags: ["Services"],
    summary: "Cập nhật dịch vụ / bật-tắt isActive (ADMIN)",
    description: "Không xoá cứng — ngừng cung cấp thì đặt `isActive=false`.",
    ...secured, request: { params: ServiceIdParams, body: json(UpdateServiceBody) },
    responses: { 200: res("Đã cập nhật", ServiceResponse), 400: err("Dữ liệu không hợp lệ"), ...guarded, 404: err("Không tìm thấy") },
});