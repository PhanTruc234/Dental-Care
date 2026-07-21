import { registry } from "../../shared/openapi/registry.js";
import { ErrorResponse } from "../../shared/openapi/error.schema.js";
import { z } from "../../shared/openapi/zod.js";
import {
    CreateStaffBody, ListStaffQuery, StaffDetailResponse,
    StaffIdParams, StaffListResponse, UpdateStaffBody,
} from "./staff.schema.js";

const json = <T extends z.ZodTypeAny>(schema: T) => ({ content: { "application/json": { schema } } });
const res = <T extends z.ZodTypeAny>(description: string, schema: T) => ({ description, ...json(schema) });
const err = (description: string) => ({ description, ...json(ErrorResponse) });
const secured = { security: [{ cookieAuth: [] }] };
const guarded = { 401: err("Chưa đăng nhập"), 403: err("Không đủ quyền") };

registry.registerPath({
    method: "post", path: "/api/v1/staff", tags: ["Staff"],
    summary: "Tạo nhân viên (ADMIN)",
    description:
        "Tạo `User` + `Staff` trong một transaction. Mã nhân viên sinh tự động. " +
        "Tài khoản được bật sẵn `emailVerified` nên đăng nhập ngay bằng mật khẩu tạm. " +
        "Email đã tồn tại sẽ bị từ chối, KHÔNG tự gắn vào tài khoản cũ.",
    ...secured,
    request: { body: json(CreateStaffBody) },
    responses: {
        201: res("Tạo thành công", StaffDetailResponse),
        400: err("Dữ liệu không hợp lệ hoặc chuyên khoa không tồn tại"),
        409: err("Email, mã NV, SĐT hoặc CCCD đã tồn tại"),
        ...guarded,
    },
});

registry.registerPath({
    method: "get", path: "/api/v1/staff", tags: ["Staff"],
    summary: "Danh sách nhân viên",
    ...secured,
    request: { query: ListStaffQuery },
    responses: { 200: res("OK", StaffListResponse), ...guarded },
});

registry.registerPath({
    method: "get", path: "/api/v1/staff/{staffId}", tags: ["Staff"],
    summary: "Chi tiết nhân viên",
    ...secured,
    request: { params: StaffIdParams },
    responses: { 200: res("OK", StaffDetailResponse), ...guarded, 404: err("Không tìm thấy") },
});

registry.registerPath({
    method: "patch", path: "/api/v1/staff/{staffId}", tags: ["Staff"],
    summary: "Cập nhật nhân viên (ADMIN)",
    description: "Gửi `specialtyIds` sẽ THAY THẾ toàn bộ danh sách chuyên khoa hiện có.",
    ...secured,
    request: { params: StaffIdParams, body: json(UpdateStaffBody) },
    responses: {
        200: res("Đã cập nhật", StaffDetailResponse),
        400: err("Dữ liệu không hợp lệ"),
        ...guarded, 404: err("Không tìm thấy"),
    },
});