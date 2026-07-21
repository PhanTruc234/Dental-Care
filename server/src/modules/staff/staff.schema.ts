import { Gender, Role, StaffStatus } from "../../generated/prisma/enums.js";
import { envelope } from "../../shared/openapi/envelope.js";
import { z } from "../../shared/openapi/zod.js";
import { PaginationQuery, pagedEnvelope } from "../../shared/schemas/pagination.schema.js";
const STAFF_ROLES = [Role.ADMIN, Role.DENTIST, Role.RECEPTIONIST, Role.ASSISTANT] as const;

const tempPassword = z.string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự").max(100)
    .regex(/[a-z]/, "Thiếu chữ thường")
    .regex(/[A-Z]/, "Thiếu chữ hoa")
    .regex(/\d/, "Thiếu chữ số")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Thiếu ký tự đặc biệt")
    .openapi({ example: "TempPass@1" });

export const StaffIdParams = z.object({
    staffId: z.string().uuid("staffId không hợp lệ"),
}).openapi("StaffIdParams");

export const CreateStaffBody = z.object({
    email: z.string().trim().toLowerCase().email("Email không hợp lệ").max(255),
    password: tempPassword,
    role: z.enum(STAFF_ROLES),
    fullName: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(200),
    gender: z.nativeEnum(Gender),
    phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại không hợp lệ").optional(),
    citizenId: z.string().trim().regex(/^\d{12}$/, "CCCD phải 12 chữ số").optional(),
    dob: z.coerce.date().optional(),
    address: z.string().trim().max(300).optional(),
    hireDate: z.coerce.date().optional(),
    specialtyIds: z.array(z.string().uuid()).max(10).optional(),
}).openapi("CreateStaffBody");

export const UpdateStaffBody = z.object({
    fullName: z.string().trim().min(2).max(200).optional(),
    gender: z.nativeEnum(Gender).optional(),
    phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại không hợp lệ").nullish(),
    citizenId: z.string().trim().regex(/^\d{12}$/, "CCCD phải 12 chữ số").nullish(),
    dob: z.coerce.date().nullish(),
    address: z.string().trim().max(300).nullish(),
    status: z.nativeEnum(StaffStatus).optional(),
    hireDate: z.coerce.date().nullish(),
    terminatedAt: z.coerce.date().nullish(),
    specialtyIds: z.array(z.string().uuid()).max(10).optional(),
}).refine((v) => Object.keys(v).length > 0, "Không có trường nào để cập nhật")
    .openapi("UpdateStaffBody");

export const ListStaffQuery = PaginationQuery.extend({
    role: z.enum(STAFF_ROLES).optional(),
    status: z.nativeEnum(StaffStatus).optional(),
    specialtyId: z.string().uuid().optional(),
    search: z.string().trim().min(1).max(100).optional(),
}).openapi("ListStaffQuery");

const SpecialtyBrief = z.object({
    specialtyId: z.string().uuid(),
    name: z.string(),
});

const StaffListItem = z.object({
    staffId: z.string().uuid(),
    userId: z.string().uuid(),
    employeeCode: z.string(),
    fullName: z.string(),
    email: z.string().email(),
    role: z.nativeEnum(Role),
    status: z.nativeEnum(StaffStatus),
    phone: z.string().nullable(),
    isActive: z.boolean(),
    specialties: z.array(SpecialtyBrief),
}).openapi("StaffListItem");

const StaffDetail = StaffListItem.extend({
    gender: z.nativeEnum(Gender),
    citizenId: z.string().nullable(),
    dob: z.date().nullable(),
    address: z.string().nullable(),
    hireDate: z.date().nullable(),
    terminatedAt: z.date().nullable(),
    createdAt: z.date(),
}).openapi("StaffDetail");

export const StaffListResponse = pagedEnvelope(StaffListItem, "StaffListResponse");
export const StaffDetailResponse = envelope(StaffDetail, "StaffDetailResponse");

export type StaffIdParams = z.infer<typeof StaffIdParams>;
export type CreateStaffBody = z.infer<typeof CreateStaffBody>;
export type UpdateStaffBody = z.infer<typeof UpdateStaffBody>;
export type ListStaffQuery = z.infer<typeof ListStaffQuery>;