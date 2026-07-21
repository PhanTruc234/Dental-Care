import { envelope } from "../../shared/openapi/envelope.js";
import { z } from "../../shared/openapi/zod.js";

export const SpecialtyIdParams = z.object({
    specialtyId: z.string().uuid("specialtyId không hợp lệ"),
}).openapi("SpecialtyIdParams");

export const CreateSpecialtyBody = z.object({
    name: z.string().trim().min(2, "Tên tối thiểu 2 ký tự").max(100)
        .openapi({ example: "Chỉnh nha" }),
}).openapi("CreateSpecialtyBody");

export const UpdateSpecialtyBody = CreateSpecialtyBody.openapi("UpdateSpecialtyBody");

// Không phân trang: danh mục chỉ vài chục dòng và frontend cần TOÀN BỘ
// để đổ dropdown. Bỏ trống search thì trả về tất cả.
export const ListSpecialtiesQuery = z.object({
    search: z.string().trim().min(1).max(100).optional()
        .openapi({ description: "Tìm theo tên hoặc mã chuyên khoa" }),
}).openapi("ListSpecialtiesQuery");

const SpecialtyItem = z.object({
    specialtyId: z.string().uuid(),
    // Sinh tự động phía server, client không gửi lên và không sửa được.
    code: z.string().openapi({ example: "SP001" }),
    name: z.string(),
    staffCount: z.number().openapi({ example: 3 }),
}).openapi("SpecialtyItem");

export const SpecialtyListResponse = envelope(z.array(SpecialtyItem), "SpecialtyListResponse");
export const SpecialtyResponse = envelope(SpecialtyItem, "SpecialtyResponse");

export type SpecialtyIdParams = z.infer<typeof SpecialtyIdParams>;
export type CreateSpecialtyBody = z.infer<typeof CreateSpecialtyBody>;
export type ListSpecialtiesQuery = z.infer<typeof ListSpecialtiesQuery>;
export type UpdateSpecialtyBody = z.infer<typeof UpdateSpecialtyBody>;