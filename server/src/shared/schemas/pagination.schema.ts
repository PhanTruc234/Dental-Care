// Phải lấy z từ openapi/zod.js - đó là nơi chạy extendZodWithOpenApi().
// Import thẳng từ "zod" hiện vẫn chạy nhờ envelope kéo theo side-effect đó,
// nhưng chỉ cần đổi thứ tự import là .openapi() thành undefined lúc khởi động.
import { envelope } from "../openapi/envelope.js";
import { z } from "../openapi/zod.js";

export const PaginationQuery = z.object({
    page: z.coerce.number().int().min(1, "page phải >= 1").default(1),
    limit: z.coerce.number().int().min(1).max(100, "limit tối đa 100").default(20),
});
export const PaginationMeta = z.object({
    page: z.number().openapi({ example: 1 }),
    limit: z.number().openapi({ example: 20 }),
    total: z.number().openapi({ example: 137 }),
    totalPages: z.number().openapi({ example: 7 }),
}).openapi("PaginationMeta");
export type PaginationQuery = z.infer<typeof PaginationQuery>;
export const pagedEnvelope = <T extends z.ZodTypeAny>(item: T, name: string) =>
    envelope(z.object({ items: z.array(item), meta: PaginationMeta }), name);