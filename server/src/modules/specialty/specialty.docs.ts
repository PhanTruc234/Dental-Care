import { registry } from "../../shared/openapi/registry.js";
import { ErrorResponse } from "../../shared/openapi/error.schema.js";
import { z } from "../../shared/openapi/zod.js";
import { MessageResponse } from "../auth/auth.schema.js";
import {
    CreateSpecialtyBody, ListSpecialtiesQuery, SpecialtyIdParams,
    SpecialtyListResponse, SpecialtyResponse, UpdateSpecialtyBody,
} from "./specialty.schema.js";

const json = <T extends z.ZodTypeAny>(schema: T) => ({ content: { "application/json": { schema } } });
const res = <T extends z.ZodTypeAny>(description: string, schema: T) => ({ description, ...json(schema) });
const err = (description: string) => ({ description, ...json(ErrorResponse) });
const secured = { security: [{ cookieAuth: [] }] };
const guarded = { 401: err("Chưa đăng nhập"), 403: err("Không đủ quyền") };

registry.registerPath({
    method: "get", path: "/api/v1/specialties", tags: ["Specialties"],
    summary: "Danh sách chuyên khoa",
    description:
        "Không phân trang — danh mục chỉ vài chục dòng và frontend cần toàn bộ để đổ dropdown. " +
        "`search` là tuỳ chọn, lọc theo tên hoặc mã; bỏ trống thì trả về tất cả.",
    ...secured,
    request: { query: ListSpecialtiesQuery },
    responses: { 200: res("OK", SpecialtyListResponse), ...guarded },
});

registry.registerPath({
    method: "post", path: "/api/v1/specialties", tags: ["Specialties"],
    summary: "Tạo chuyên khoa (ADMIN)",
    ...secured,
    request: { body: json(CreateSpecialtyBody) },
    responses: { 201: res("Đã tạo", SpecialtyResponse), 409: err("Tên đã tồn tại"), ...guarded },
});

registry.registerPath({
    method: "patch", path: "/api/v1/specialties/{specialtyId}", tags: ["Specialties"],
    summary: "Đổi tên chuyên khoa (ADMIN)",
    ...secured,
    request: { params: SpecialtyIdParams, body: json(UpdateSpecialtyBody) },
    responses: {
        200: res("Đã cập nhật", SpecialtyResponse),
        409: err("Tên đã tồn tại"), ...guarded, 404: err("Không tìm thấy"),
    },
});

registry.registerPath({
    method: "delete", path: "/api/v1/specialties/{specialtyId}", tags: ["Specialties"],
    summary: "Xoá chuyên khoa (ADMIN)",
    description: "Bị chặn nếu còn nhân viên đang gắn chuyên khoa này.",
    ...secured,
    request: { params: SpecialtyIdParams },
    responses: {
        200: res("Đã xoá", MessageResponse),
        400: err("Còn nhân viên đang sử dụng"), ...guarded, 404: err("Không tìm thấy"),
    },
});