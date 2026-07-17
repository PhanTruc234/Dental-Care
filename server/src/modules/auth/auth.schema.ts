import { Role } from "../../generated/prisma/enums.js";
import { envelope } from "../../shared/openapi/envelope.js";
import { z } from "../../shared/openapi/zod.js";

const email = z.string().trim().toLowerCase().email("Email không hợp lệ").max(255, "Email không được vượt quá 254 ký tự").openapi({ example: "dentist@gmail.com" });

const strongPassword = z.string().min(8, "Mật khẩu tối thiếu 8 kí tự").max(100, "Mật khẩu tối đa 100 kí tự")
    .regex(/[a-z]/, "Thiếu chữ thường")
    .regex(/[A-Z]/, "Thiếu chữ hoa")
    .regex(/\d/, "Thiếu chữ số")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Thiếu ký tự đặc biệt").openapi({ example: "S3curePass!" });

export const LoginBody = z.object({
    email: email,
    password: strongPassword,
}).openapi("LoginBody");

export const RegisterBody = z.object({
    fullName: z.string().trim().min(2, "Tên tối thiếu 2 kí tự").max(200, "Tên tối đa 200 kí tự").openapi({ example: "Nguyễn Văn A" }),
    email: email,
    password: strongPassword,
    phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại không hợp lệ").optional().openapi({ example: "0912345678" })
}).openapi("RegisterBody")

export const ResendVerificationBody = z.object({
    email,
}).openapi("ResendVerificationBody");

export const GoogleLoginBody = z.object({
    idToken: z.string().min(1, "Thiếu idToken").openapi({ example: "eyJhbGciOi..." }),
}).openapi("GoogleLoginBody");

export const ForgotPasswordBody = z.object({
    email,
}).openapi("ForgotPasswordBody");

export const ResetPasswordBody = z.object({
    token: z.string().min(1, "Thiếu token"),
    newPassword: strongPassword,
}).openapi("ResetPasswordBody");

export const ChangePasswordBody = z.object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPassword: strongPassword,
}).openapi("ChangePasswordBody");

export const VerifyEmailQuery = z.object({
    token: z.string().min(1, "Thiếu token"),
}).openapi("VerifyEmailQuery");
export const SessionIdParams = z.object({
    sessionId: z.string().uuid("Session id không hợp lệ"),
}).openapi("SessionIdParams");
const PatientProfile = z.object({
    patientId: z.string().uuid(),
    fullName: z.string(),
    patientCode: z.string(),
    phone: z.string().nullable(),
}).openapi("PatientProfile");

const StaffProfile = z.object({
    staffId: z.string().uuid(),
    fullName: z.string(),
    employeeCode: z.string(),
}).openapi("StaffProfile");
export const MessageResponse = z.object({
    message: z.string().openapi({ example: "Thao tác thành công" }),
}).openapi("MessageResponse");

export const RegisterResponse = envelope(
    z.object({
        id: z.string().uuid(),
        fullName: z.string(),
        email: z.string().email(),
        role: z.nativeEnum(Role),
        emailVerified: z.boolean(),
    }),
    "RegisterResponse",
);

export const LoginResponse = envelope(
    z.object({
        accessToken: z.string().openapi({ example: "eyJhbGciOi..." }),
        user: z.object({
            id: z.string().uuid(),
            email: z.string().email(),
            role: z.nativeEnum(Role),
        }),
    }),
    "LoginResponse",
);

export const MeResponse = envelope(
    z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        role: z.nativeEnum(Role),
        profile: z.union([PatientProfile, StaffProfile]).nullable(),
    }),
    "MeResponse",
);

export const SessionsResponse = envelope(
    z.array(
        z.object({
            id: z.string().uuid(),
            device: z.string().openapi({ example: "Chrome 120 trên Windows 10" }),
            ip: z.string().nullable().openapi({ example: "14.161.20.5" }),
            loginAt: z.string().datetime(),
            current: z.boolean().openapi({ example: true }),
        }),
    ),
    "SessionsResponse",
);



export type RegisterBody = z.infer<typeof RegisterBody>
export type LoginBody = z.infer<typeof LoginBody>;
export type ResendVerificationBody = z.infer<typeof ResendVerificationBody>;
export type GoogleLoginBody = z.infer<typeof GoogleLoginBody>;
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBody>;
export type ResetPasswordBody = z.infer<typeof ResetPasswordBody>;
export type ChangePasswordBody = z.infer<typeof ChangePasswordBody>;
export type VerifyEmailQuery = z.infer<typeof VerifyEmailQuery>;
export type SessionIdParams = z.infer<typeof SessionIdParams>;