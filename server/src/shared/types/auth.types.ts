// Lấy thẳng từ Prisma để thêm role mới trong schema là tự động khớp ở đây.
export type { Role } from "../../generated/prisma/enums.js";
import type { Role } from "../../generated/prisma/enums.js";

export type TokenPayload = {
    id: string;
    role: Role;
    email: string;
}

export type AccessTokenPayload = {
    sid: string;
    iat: number;
} & TokenPayload