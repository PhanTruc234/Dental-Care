import { AuthProvider, Role, StaffStatus } from "../../generated/prisma/enums.js";
import { envelope } from "../../shared/openapi/envelope.js";
import { z } from "../../shared/openapi/zod.js";
import { PaginationQuery, pagedEnvelope } from "../../shared/schemas/pagination.schema.js";

export const UserIdParams = z.object({
    userId: z.string().uuid("userId không hợp lệ"),
}).openapi("UserIdParams");

export const ListUsersQuery = PaginationQuery.extend({
    role: z.nativeEnum(Role).optional(),
    isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
    search: z.string().trim().min(1).max(100).optional()
        .openapi({ description: "Tìm theo email hoặc họ tên" }),
}).openapi("ListUsersQuery");

export const UpdateUserStatusBody = z.object({
    isActive: z.boolean(),
}).openapi("UpdateUserStatusBody");

export const UpdateUserRoleBody = z.object({
    role: z.nativeEnum(Role),
}).openapi("UpdateUserRoleBody");

const UserListItem = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.nativeEnum(Role),
    isActive: z.boolean(),
    emailVerified: z.boolean(),
    fullName: z.string().nullable(),
    createdAt: z.date(),
}).openapi("UserListItem");

const UserDetail = UserListItem.extend({
    authProvider: z.nativeEnum(AuthProvider),
    updatedAt: z.date(),
    staff: z.object({
        staffId: z.string().uuid(),
        employeeCode: z.string(),
        status: z.nativeEnum(StaffStatus),
    }).nullable(),
    patient: z.object({
        patientId: z.string().uuid(),
        patientCode: z.string(),
    }).nullable(),
}).openapi("UserDetail");

export const UsersResponse = pagedEnvelope(UserListItem, "UsersResponse");
export const UserDetailResponse = envelope(UserDetail, "UserDetailResponse");

export type UserIdParams = z.infer<typeof UserIdParams>;
export type ListUsersQuery = z.infer<typeof ListUsersQuery>;
export type UpdateUserStatusBody = z.infer<typeof UpdateUserStatusBody>;
export type UpdateUserRoleBody = z.infer<typeof UpdateUserRoleBody>;