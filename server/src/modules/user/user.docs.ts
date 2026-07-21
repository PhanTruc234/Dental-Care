import { registry } from "../../shared/openapi/registry.js";
import { ErrorResponse } from "../../shared/openapi/error.schema.js";
import { z } from "../../shared/openapi/zod.js";
import { MessageResponse } from "../auth/auth.schema.js";
import {
    ListUsersQuery, UpdateUserRoleBody, UpdateUserStatusBody,
    UserDetailResponse, UserIdParams, UsersResponse,
} from "./user.schema.js";

const json = <T extends z.ZodTypeAny>(schema: T) => ({ content: { "application/json": { schema } } });
const res = <T extends z.ZodTypeAny>(description: string, schema: T) => ({ description, ...json(schema) });
const err = (description: string) => ({ description, ...json(ErrorResponse) });
const secured = { security: [{ cookieAuth: [] }] };
const adminOnly = { 401: err("Chưa đăng nhập"), 403: err("Chỉ ADMIN được phép") };

registry.registerPath({
    method: "get", path: "/api/v1/users", tags: ["Users"],
    summary: "Danh sách tài khoản",
    description: "Lọc theo vai trò, trạng thái; tìm theo email hoặc họ tên.",
    ...secured,
    request: { query: ListUsersQuery },
    responses: { 200: res("OK", UsersResponse), ...adminOnly },
});

registry.registerPath({
    method: "get", path: "/api/v1/users/{userId}", tags: ["Users"],
    summary: "Chi tiết tài khoản",
    ...secured,
    request: { params: UserIdParams },
    responses: { 200: res("OK", UserDetailResponse), ...adminOnly, 404: err("Không tìm thấy") },
});

registry.registerPath({
    method: "patch", path: "/api/v1/users/{userId}/status", tags: ["Users"],
    summary: "Khoá / mở khoá tài khoản",
    description: "Khoá sẽ thu hồi toàn bộ phiên đăng nhập. Không thể tự khoá chính mình.",
    ...secured,
    request: { params: UserIdParams, body: json(UpdateUserStatusBody) },
    responses: {
        200: res("Đã cập nhật", MessageResponse),
        400: err("Tự khoá chính mình"),
        ...adminOnly, 404: err("Không tìm thấy"),
    },
});

registry.registerPath({
    method: "patch", path: "/api/v1/users/{userId}/role", tags: ["Users"],
    summary: "Đổi vai trò",
    description: "Vai trò nhân viên yêu cầu tài khoản đã có hồ sơ Staff. Không thể tự đổi vai trò của mình.",
    ...secured,
    request: { params: UserIdParams, body: json(UpdateUserRoleBody) },
    responses: {
        200: res("Đã cập nhật", MessageResponse),
        400: err("Tự đổi vai trò, hoặc thiếu hồ sơ nhân viên"),
        ...adminOnly, 404: err("Không tìm thấy"),
    },
});