import { registry } from "../../shared/openapi/registry.js";
import { ErrorResponse } from "../../shared/openapi/error.schema.js";
import { z } from "../../shared/openapi/zod.js";
import {
    ChangePasswordBody, ForgotPasswordBody, GoogleLoginBody, LoginBody, LoginResponse,
    MeResponse, MessageResponse, RegisterBody, RegisterResponse, ResendVerificationBody,
    ResetPasswordBody, SessionIdParams, SessionsResponse, VerifyEmailQuery,
} from "./auth.schema.js";

const json = <T extends z.ZodTypeAny>(schema: T) => ({ content: { "application/json": { schema } } });
const res = <T extends z.ZodTypeAny>(description: string, schema: T) => ({ description, ...json(schema) });
const err = (description: string) => ({ description, ...json(ErrorResponse) });
const secured = { security: [{ cookieAuth: [] }] };

const rateLimited = { 429: err("Quá nhiều request (rate limit)") };
const invalid = { 400: err("Dữ liệu không hợp lệ") };
const unauth = { 401: err("Chưa đăng nhập hoặc phiên đã kết thúc") };

registry.registerPath({
    method: "post", path: "/api/v1/auth/register", tags: ["Auth"],
    summary: "Đăng ký tài khoản bệnh nhân",
    description: "Tạo User + hồ sơ Patient, gửi email xác thực. `phone` là tuỳ chọn.",
    request: { body: json(RegisterBody) },
    responses: {
        201: res("Đăng ký thành công", RegisterResponse),
        ...invalid,
        409: err("Email đã được đăng ký"),
        ...rateLimited,
    },
});

registry.registerPath({
    method: "get", path: "/api/v1/auth/verify-email", tags: ["Auth"],
    summary: "Xác nhận email",
    description: "Token lấy từ link trong email — KHÔNG có API nào trả token này.",
    request: { query: VerifyEmailQuery },
    responses: { 200: res("Xác nhận thành công", MessageResponse), 400: err("Token không hợp lệ hoặc đã hết hạn") },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/resend-verification", tags: ["Auth"],
    summary: "Gửi lại email xác thực",
    request: { body: json(ResendVerificationBody) },
    responses: {
        200: res("Đã gửi lại", MessageResponse),
        404: err("Không tìm thấy tài khoản"),
        400: err("Email đã được xác nhận"),
        ...rateLimited,
    },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/login", tags: ["Auth"],
    summary: "Đăng nhập bằng email & mật khẩu",
    description: "Thành công sẽ **set cookie httpOnly** (`accessToken`, `refreshToken`). Vì Scalar cùng origin nên các endpoint cần đăng nhập sẽ tự chạy được sau khi gọi API này.",
    request: { body: json(LoginBody) },
    responses: {
        200: res("Đăng nhập thành công", LoginResponse),
        ...invalid,
        401: err("Sai email/mật khẩu, chưa xác thực email, hoặc tài khoản bị vô hiệu hoá"),
        ...rateLimited,
    },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/google", tags: ["Auth"],
    summary: "Đăng nhập bằng Google",
    description: "`idToken` do Google Identity Services trả về ở phía frontend.",
    request: { body: json(GoogleLoginBody) },
    responses: {
        200: res("Đăng nhập Google thành công", LoginResponse),
        ...invalid,
        401: err("Token Google không hợp lệ"),
        ...rateLimited,
    },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/refresh-token", tags: ["Auth"],
    summary: "Làm mới phiên",
    description: "Đọc `refreshToken` từ cookie, xoay vòng token. Phát hiện tái sử dụng token sẽ thu hồi **toàn bộ** phiên.",
    responses: { 200: res("Đã làm mới", MessageResponse), ...unauth, ...rateLimited },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/logout", tags: ["Auth"],
    summary: "Đăng xuất thiết bị hiện tại",
    description: "Chỉ thu hồi phiên của thiết bị này — thiết bị khác không bị ảnh hưởng.",
    responses: { 200: res("Đăng xuất thành công", MessageResponse) },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/forgot-password", tags: ["Password"],
    summary: "Quên mật khẩu",
    description: "Luôn trả cùng một thông báo dù email tồn tại hay không (chống dò email). Link đặt lại gửi qua email.",
    request: { body: json(ForgotPasswordBody) },
    responses: { 200: res("Đã tiếp nhận", MessageResponse), ...invalid, ...rateLimited },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/reset-password", tags: ["Password"],
    summary: "Đặt lại mật khẩu",
    description: "`token` lấy từ email. Thành công sẽ **thu hồi mọi phiên** → phải đăng nhập lại.",
    request: { body: json(ResetPasswordBody) },
    responses: { 200: res("Đặt lại thành công", MessageResponse), 400: err("Token không hợp lệ hoặc đã hết hạn"), ...rateLimited },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/change-password", tags: ["Password"],
    summary: "Đổi mật khẩu (đang đăng nhập)",
    description: "Giữ phiên hiện tại, **đá mọi thiết bị khác**.",
    ...secured,
    request: { body: json(ChangePasswordBody) },
    responses: {
        200: res("Đổi mật khẩu thành công", MessageResponse),
        ...invalid,
        401: err("Mật khẩu hiện tại không đúng hoặc chưa đăng nhập"),
        ...rateLimited,
    },
});

registry.registerPath({
    method: "get", path: "/api/v1/auth/me", tags: ["Sessions"],
    summary: "Thông tin tài khoản đang đăng nhập",
    ...secured,
    responses: { 200: res("OK", MeResponse), ...unauth, 404: err("Không tìm thấy tài khoản") },
});

registry.registerPath({
    method: "get", path: "/api/v1/auth/sessions", tags: ["Sessions"],
    summary: "Danh sách thiết bị đang đăng nhập",
    description: "`current: true` là thiết bị bạn đang dùng.",
    ...secured,
    responses: { 200: res("OK", SessionsResponse), ...unauth },
});

registry.registerPath({
    method: "post", path: "/api/v1/auth/logout-all", tags: ["Sessions"],
    summary: "Đăng xuất khỏi mọi thiết bị",
    ...secured,
    responses: { 200: res("Đã đăng xuất tất cả", MessageResponse), ...unauth },
});

registry.registerPath({
    method: "delete", path: "/api/v1/auth/sessions/{sessionId}", tags: ["Sessions"],
    summary: "Đăng xuất một thiết bị từ xa",
    ...secured,
    request: { params: SessionIdParams },
    responses: { 200: res("Đã đăng xuất thiết bị", MessageResponse), ...unauth, 404: err("Không tìm thấy phiên") },
});
